// In-memory fakes of identity, catalog and pricing, shaped by their OpenAPI contracts. Tests tweak `state` to
// provoke failures; `reset()` runs before each test.
import type { UpstreamCall, UpstreamReply } from './upstream'

export const PASSWORD = 'correct-horse-battery'

export const admin = {
  id: '01admin',
  email: 'admin@shopwise.test',
  name: 'Shopwise Admin',
  roles: ['customer', 'admin'],
  registeredAt: '2026-10-26T00:00:00Z',
}

export const customer = {
  id: '01customer',
  email: 'customer@shopwise.test',
  name: 'Ada',
  roles: ['customer'],
  registeredAt: '2026-10-26T00:00:00Z',
}

const accounts = [admin, customer]

export const product = {
  id: '01product',
  slug: 'merino-crew-tee',
  name: 'Merino Crew Tee',
  description: 'Soft.',
  category: { id: '01apparel', slug: 'apparel', name: 'Apparel' },
  images: [],
  variants: [
    { id: '01variant-m', sku: 'TEE-BLK-M', name: 'Black / M', options: { color: 'Black', size: 'M' }, active: true },
  ],
  status: 'draft',
  publishedAt: null,
}

export const coupon = {
  code: 'WELCOME10',
  description: '10% off your order',
  type: 'percent',
  value: 10,
  minSubtotal: 0,
  startsAt: null,
  endsAt: null,
  active: true,
  createdAt: '2026-10-26T00:00:00Z',
}

export const state = {
  /** Lifetime of issued access tokens, in seconds. 0 makes the BFF refresh on its next request. */
  accessTtl: 900,
  /** Access tokens the services answer 401 to (e.g. signed with a rotated key). */
  rejectedAccess: new Set<string>(),
  /** Holds the refresh response back, so concurrent requests overlap. */
  refreshDelayMs: 0,
  refreshFails: false,
  /** Accounts whose admin role was taken away (identity answers /api/me without it). */
  demoted: new Set<string>(),
  /** Refresh tokens that came back after being spent: identity would revoke the family. */
  reusedRefreshTokens: [] as string[],
  revoked: [] as string[],
  published: false,
}

// Token numbers keep counting across tests: the BFF's refresh coordinator outlives a test.
let issued = 0
const spent = new Set<string>()
/** Refresh and access tokens to the account id they were issued for. */
const owners = new Map<string, string>()

export function reset() {
  state.accessTtl = 900
  state.rejectedAccess.clear()
  state.refreshDelayMs = 0
  state.refreshFails = false
  state.demoted.clear()
  state.reusedRefreshTokens = []
  state.revoked = []
  state.published = false
}

/** The number in the last issued `access-N` / `refresh-N` pair. */
export const lastIssued = () => issued

function issuePair(accountId: string) {
  issued += 1
  owners.set(`access-${issued}`, accountId)
  owners.set(`refresh-${issued}`, accountId)

  return {
    tokenType: 'Bearer',
    accessToken: `access-${issued}`,
    expiresIn: state.accessTtl,
    refreshToken: `refresh-${issued}`,
    refreshExpiresIn: 2_592_000,
  }
}

const ok = (body: unknown, status = 200): UpstreamReply => ({ status, body })
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function account(id: string | undefined) {
  const found = accounts.find((candidate) => candidate.id === id)

  return found && state.demoted.has(found.id) ? { ...found, roles: ['customer'] } : found
}

/** The account behind a valid bearer token. */
function bearer(call: UpstreamCall) {
  const token = call.headers.authorization?.replace(/^Bearer /, '')

  return token && !state.rejectedAccess.has(token) ? account(owners.get(token)) : undefined
}

/** What an `auth.jwt:admin` route answers when the caller is not an admin, or undefined to go ahead. */
function adminGuard(call: UpstreamCall): UpstreamReply | undefined {
  const caller = bearer(call)
  if (!caller) {
    return { status: 401, body: { message: 'Unauthenticated.' } }
  }
  if (!caller.roles.includes('admin')) {
    return { status: 403, body: { message: 'Forbidden.' } }
  }
}

async function identity(call: UpstreamCall): Promise<UpstreamReply | undefined> {
  switch (`${call.method} ${call.path}`) {
    case 'POST /api/tokens': {
      const match = accounts.find((candidate) => candidate.email === call.body?.email)

      return match && call.body?.password === PASSWORD
        ? ok({ data: issuePair(match.id) })
        : { status: 422, body: { message: 'These credentials do not match our records.' } }
    }
    case 'POST /api/tokens/refresh': {
      const token = String(call.body?.refreshToken)
      await sleep(state.refreshDelayMs)
      if (spent.has(token)) {
        state.reusedRefreshTokens.push(token)

        return { status: 401 }
      }
      if (state.refreshFails || !owners.has(token) || state.revoked.includes(token)) {
        return { status: 401 }
      }
      spent.add(token)

      return ok({ data: issuePair(owners.get(token)!) })
    }
    case 'GET /api/me': {
      const caller = bearer(call)

      return caller ? ok({ data: caller }) : { status: 401 }
    }
    case 'POST /api/tokens/revoke':
      state.revoked.push(String(call.body?.refreshToken))

      return { status: 204 }
  }
}

function catalog(call: UpstreamCall): UpstreamReply | undefined {
  const route = `${call.method} ${call.path}`
  switch (route) {
    case 'GET /api/categories':
      return ok({ data: [{ id: '01apparel', slug: 'apparel', name: 'Apparel', parentId: null }] })
    case 'GET /api/products':
      return ok({
        data: [{ id: product.id, slug: product.slug, name: product.name, category: product.category, image: null }],
        meta: { page: 1, perPage: 24, total: 1, lastPage: 1 },
        facets: { categories: [], options: [] },
      })
    case `GET /api/products/${product.slug}`:
      return ok({ data: { ...product, status: 'published' } })
    case 'GET /api/products/missing':
      return { status: 404, body: { message: 'Not found.' } }
  }
  if (!call.path.startsWith('/api/admin/')) {
    return undefined
  }
  const denied = adminGuard(call)
  if (denied) {
    return denied
  }
  if (route === 'POST /api/admin/products') {
    if (call.body?.slug === 'taken') {
      return {
        status: 422,
        body: { message: 'The slug has already been taken.', errors: { slug: ['The slug has already been taken.'] } },
      }
    }

    return ok({ data: { ...product, name: call.body?.name } }, 201)
  }
  if (route === `POST /api/admin/products/${product.id}/publish`) {
    if (state.published) {
      return { status: 409, body: { message: 'The product is already published.' } }
    }
    state.published = true

    return ok({ data: { ...product, status: 'published', publishedAt: '2026-10-26T00:00:00Z' } })
  }
  if (route === `PATCH /api/admin/variants/${product.variants[0]!.id}`) {
    return ok({ data: { ...product.variants[0], ...call.body } })
  }
  if (call.method === 'PATCH' && call.path.startsWith('/api/admin/variants/')) {
    return { status: 404, body: { message: 'Not found.' } }
  }
}

function pricing(call: UpstreamCall): UpstreamReply | undefined {
  const route = `${call.method} ${call.path}`
  if (route === 'GET /api/prices') {
    const skus = call.query.getAll('skus[]')

    return ok({
      data: skus.filter((sku) => sku === 'TEE-BLK-M').map((sku) => ({ sku, amount: 4500, currency: 'USD' })),
    })
  }
  if (!call.path.startsWith('/api/admin/')) {
    return undefined
  }
  const denied = adminGuard(call)
  if (denied) {
    return denied
  }
  const priceMatch = /^\/api\/admin\/prices\/([^/]+)$/.exec(call.path)
  if (call.method === 'PUT' && priceMatch) {
    const sku = decodeURIComponent(priceMatch[1]!)

    return sku === 'UNKNOWN'
      ? { status: 404, body: { message: 'Unknown SKU.' } }
      : ok({ data: { sku, amount: call.body?.amount, currency: call.body?.currency } })
  }
  if (route === 'GET /api/admin/coupons') {
    return ok({ data: [coupon] })
  }
  if (route === 'POST /api/admin/coupons') {
    return call.body?.code === coupon.code
      ? { status: 422, body: { message: 'The code has already been taken.', errors: { code: ['taken'] } } }
      : ok({ data: { ...call.body, active: true, createdAt: '2026-10-26T00:00:00Z' } }, 201)
  }
  if (route === `DELETE /api/admin/coupons/${coupon.code}`) {
    return { status: 204 }
  }
  if (call.method === 'DELETE' && call.path.startsWith('/api/admin/coupons/')) {
    return { status: 404, body: { message: 'Unknown coupon.' } }
  }
}

export async function reply(call: UpstreamCall): Promise<UpstreamReply> {
  return (
    (await identity(call)) ??
    catalog(call) ??
    pricing(call) ?? {
      status: 500,
      body: { message: 'SQLSTATE[42P01]: relation "coupons" does not exist' },
    }
  )
}
