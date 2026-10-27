// Builds the app and runs the real Nitro server against fake identity, catalog, pricing, inventory and orders.
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { startUpstream, type UpstreamCall } from './upstream'
import { PASSWORD, admin, coupon, customer, lastIssued, order, product, reply, reset, state } from './fake-services'

const upstream = await startUpstream(reply)
for (const service of ['IDENTITY', 'CATALOG', 'PRICING', 'INVENTORY', 'ORDERS']) {
  process.env[`NUXT_${service}_URL`] = upstream.url
}
process.env.NUXT_SESSION_PASSWORD = 'test-session-password-at-least-32-chars'

await setup({ server: true, browser: false })

afterAll(() => upstream.close())
beforeEach(() => {
  upstream.calls.length = 0
  reset()
})

/** Keeps the cookies a browser would: each response's Set-Cookie replaces (or deletes) the stored one. */
class Browser {
  private cookies = new Map<string, string>()

  get cookie(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  async request(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}): Promise<Response> {
    const cookie = init.cookie ?? this.cookie
    const response = await fetch(path, {
      method: init.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    this.store(response)

    return response
  }

  store(response: Response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(';')
      const [name, ...value] = pair!.split('=')
      if (value.join('=') === '') {
        this.cookies.delete(name!)
      } else {
        this.cookies.set(name!, value.join('='))
      }
    }
  }

  post = (path: string, body?: unknown) => this.request(path, { method: 'POST', body })

  async session() {
    return (await this.request('/api/_auth/session')).json()
  }

  async signIn(email = admin.email) {
    const response = await this.post('/api/auth/login', { email, password: PASSWORD })
    expect(response.status).toBe(200)

    return response
  }
}

const callsTo = (method: string, path: string): UpstreamCall[] =>
  upstream.calls.filter((call) => call.method === method && call.path === path)

async function signedIn() {
  const browser = new Browser()
  await browser.signIn()
  upstream.calls.length = 0

  return browser
}

describe('auth', () => {
  it('signs an admin in and keeps tokens out of the browser', async () => {
    const browser = new Browser()
    const response = await browser.signIn()

    expect(await response.json()).toEqual({ data: admin })
    expect(callsTo('GET', '/api/me')[0]?.headers.authorization).toMatch(/^Bearer access-\d+$/)
    const current = await browser.session()
    expect(current.user).toEqual({ id: admin.id, email: admin.email, name: admin.name, roles: admin.roles })
    expect(JSON.stringify(current)).not.toMatch(/access-|refresh-/)
    expect(response.headers.getSetCookie().join()).toMatch(/^shopwise-admin-session=/)
  })

  it('refuses an account without the admin role, revokes its new refresh token and starts no session', async () => {
    const browser = new Browser()
    const response = await browser.post('/api/auth/login', { email: customer.email, password: PASSWORD })

    expect(response.status).toBe(403)
    expect((await response.json()).statusMessage).toBe('This account is not an admin.')
    expect(state.revoked).toEqual([`refresh-${lastIssued()}`])
    expect((await browser.session()).user).toBeUndefined()
  })

  it("passes identity's message through when credentials are wrong", async () => {
    const response = await new Browser().post('/api/auth/login', { email: admin.email, password: 'wrong-password' })

    expect(response.status).toBe(422)
    expect((await response.json()).statusMessage).toBe('These credentials do not match our records.')
  })

  it('rejects a malformed body without calling identity', async () => {
    const response = await new Browser().post('/api/auth/login', { email: 'not-an-email' })

    expect(response.status).toBe(400)
    expect(upstream.calls).toHaveLength(0)
  })

  it('signs out: revokes the refresh token and clears the session', async () => {
    const browser = await signedIn()
    const refreshToken = `refresh-${lastIssued()}`

    const response = await browser.post('/api/auth/logout')

    expect(response.status).toBe(204)
    expect(state.revoked).toEqual([refreshToken])
    expect((await browser.session()).user).toBeUndefined()
    expect((await browser.request('/api/pricing/coupons')).status).toBe(401)
  })
})

describe('admin-only API', () => {
  const routes: Array<[string, string, unknown?]> = [
    ['GET', '/api/catalog/categories'],
    ['GET', '/api/catalog/products'],
    ['GET', `/api/catalog/products/${product.id}`],
    ['POST', '/api/catalog/products', { name: 'Tee', categoryId: 'c', variants: [{ sku: 'S', name: 'S' }] }],
    ['POST', `/api/catalog/products/${product.id}/publish`],
    ['PATCH', '/api/catalog/variants/01variant-m', { active: false }],
    ['GET', '/api/pricing/prices?skus[]=TEE-BLK-M'],
    ['PUT', '/api/pricing/prices/TEE-BLK-M', { amount: 100, currency: 'USD' }],
    ['GET', '/api/pricing/coupons'],
    ['POST', '/api/pricing/coupons', { code: 'X', type: 'percent', value: 5 }],
    ['DELETE', `/api/pricing/coupons/${coupon.code}`],
    ['GET', '/api/orders'],
    ['GET', `/api/orders/${order.id}`],
    ['PUT', `/api/orders/${order.id}/shipment`, { carrier: 'UPS', trackingNumber: '1Z' }],
    ['GET', '/api/inventory/stock'],
    ['GET', '/api/inventory/stock/TEE-BLK-M'],
    ['PUT', '/api/inventory/stock/TEE-BLK-M', { onHand: 10 }],
  ]

  it.each(routes)('%s %s answers 401 without a session and never calls a service', async (method, path, body) => {
    const response = await new Browser().request(path, { method, body })

    expect(response.status).toBe(401)
    expect(upstream.calls).toHaveLength(0)
  })

  it('ends the session when the refresh forced by a service 401 shows the admin role is gone', async () => {
    const browser = await signedIn()
    state.demoted.add(admin.id)
    state.rejectedAccess.add(`access-${lastIssued()}`)

    const response = await browser.request('/api/pricing/coupons')

    expect(response.status).toBe(401)
    expect(callsTo('GET', '/api/admin/coupons')).toHaveLength(1)
    expect((await browser.session()).user).toBeUndefined()
  })
})

describe('catalog', () => {
  it('lists categories and products from the admin listing, drafts included, dropping unknown filters', async () => {
    const browser = await signedIn()

    expect((await browser.request('/api/catalog/categories')).status).toBe(200)
    const response = await browser.request(
      '/api/catalog/products?q=tee&status=draft&category=apparel&page=2&sort=price',
    )

    expect(response.status).toBe(200)
    expect((await response.json()).data[0]).toMatchObject({ slug: product.slug, status: 'draft', variantCount: 2 })
    expect(callsTo('GET', '/api/products')).toHaveLength(0)
    const call = callsTo('GET', '/api/admin/products')[0]!
    expect(Object.fromEntries(call.query)).toEqual({ q: 'tee', status: 'draft', category: 'apparel', page: '2' })
    expect(call.headers.authorization).toBe(`Bearer access-${lastIssued()}`)
  })

  it('rejects an unknown product status without calling catalog', async () => {
    const browser = await signedIn()

    expect((await browser.request('/api/catalog/products?status=archived')).status).toBe(400)
    expect(upstream.calls).toHaveLength(0)
  })

  it('shows a product by id from the admin read, and passes a missing one through as 404', async () => {
    const browser = await signedIn()

    const response = await browser.request(`/api/catalog/products/${product.id}`)
    expect((await response.json()).data).toMatchObject({ id: product.id, status: 'draft' })
    expect(callsTo('GET', `/api/admin/products/${product.id}`)[0]?.headers.authorization).toBe(
      `Bearer access-${lastIssued()}`,
    )
    expect((await browser.request('/api/catalog/products/missing')).status).toBe(404)
  })

  it('creates a draft product', async () => {
    const browser = await signedIn()
    const input = {
      name: 'Linen Shirt',
      categoryId: '01apparel',
      variants: [{ sku: 'LIN-M', name: 'M', options: { size: 'M' } }],
    }

    const response = await browser.post('/api/catalog/products', input)

    expect(response.status).toBe(201)
    expect((await response.json()).data.name).toBe('Linen Shirt')
    const call = callsTo('POST', '/api/admin/products')[0]!
    expect(call.body).toEqual(input)
    expect(call.headers.authorization).toBe(`Bearer access-${lastIssued()}`)
  })

  it('rejects a product without variants before calling catalog', async () => {
    const browser = await signedIn()

    const response = await browser.post('/api/catalog/products', { name: 'Tee', categoryId: 'c', variants: [] })

    expect(response.status).toBe(400)
    expect(upstream.calls).toHaveLength(0)
  })

  it("passes catalog's validation errors through", async () => {
    const browser = await signedIn()

    const response = await browser.post('/api/catalog/products', {
      name: 'Tee',
      slug: 'taken',
      categoryId: 'c',
      variants: [{ sku: 'S', name: 'S' }],
    })

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.statusMessage).toBe('The slug has already been taken.')
    expect(body.data.errors.slug).toEqual(['The slug has already been taken.'])
  })

  it('publishes a draft once and passes the conflict through', async () => {
    const browser = await signedIn()

    const first = await browser.post(`/api/catalog/products/${product.id}/publish`)
    const second = await browser.post(`/api/catalog/products/${product.id}/publish`)

    expect(first.status).toBe(200)
    expect((await first.json()).data.status).toBe('published')
    expect(second.status).toBe(409)
    expect((await second.json()).statusMessage).toBe('The product is already published.')
  })

  it('updates a variant and rejects an empty change', async () => {
    const browser = await signedIn()

    const response = await browser.request('/api/catalog/variants/01variant-m', {
      method: 'PATCH',
      body: { active: false, name: 'Black / Medium' },
    })
    expect(response.status).toBe(200)
    expect((await response.json()).data).toMatchObject({ active: false, name: 'Black / Medium' })

    const empty = await browser.request('/api/catalog/variants/01variant-m', { method: 'PATCH', body: {} })
    expect(empty.status).toBe(400)
    expect(callsTo('PATCH', '/api/admin/variants/01variant-m')).toHaveLength(1)
  })

  it('turns a catalog failure into a 502 without leaking its message', async () => {
    const browser = await signedIn()

    const response = await browser.request('/api/catalog/products/broken')

    expect(response.status).toBe(502)
    expect(JSON.stringify(await response.json())).not.toContain('SQLSTATE')
  })
})

describe('pricing', () => {
  it('reads prices for repeated skus[]', async () => {
    const browser = await signedIn()

    const response = await browser.request('/api/pricing/prices?skus[]=TEE-BLK-M&skus[]=MUG-WHT')

    expect((await response.json()).data).toEqual([{ sku: 'TEE-BLK-M', amount: 4500, currency: 'USD' }])
    expect(callsTo('GET', '/api/prices')[0]!.query.getAll('skus[]')).toEqual(['TEE-BLK-M', 'MUG-WHT'])
  })

  it('sets a SKU price and passes an unknown SKU through as 404', async () => {
    const browser = await signedIn()

    const response = await browser.request('/api/pricing/prices/TEE-BLK-M', {
      method: 'PUT',
      body: { amount: 3900, currency: 'USD' },
    })
    expect(response.status).toBe(200)
    expect((await response.json()).data).toEqual({ sku: 'TEE-BLK-M', amount: 3900, currency: 'USD' })
    expect(callsTo('PUT', '/api/admin/prices/TEE-BLK-M')[0]?.body).toEqual({ amount: 3900, currency: 'USD' })

    const unknown = await browser.request('/api/pricing/prices/UNKNOWN', {
      method: 'PUT',
      body: { amount: 100, currency: 'USD' },
    })
    expect(unknown.status).toBe(404)
  })

  it('rejects a negative price or another currency before calling pricing', async () => {
    const browser = await signedIn()

    for (const body of [
      { amount: -1, currency: 'USD' },
      { amount: 1.5, currency: 'USD' },
      { amount: 100, currency: 'EUR' },
    ]) {
      expect((await browser.request('/api/pricing/prices/TEE-BLK-M', { method: 'PUT', body })).status).toBe(400)
    }
    expect(upstream.calls).toHaveLength(0)
  })

  it('lists, creates and deactivates coupons', async () => {
    const browser = await signedIn()

    expect((await (await browser.request('/api/pricing/coupons')).json()).data).toEqual([coupon])

    const input = { code: 'SPRING20', type: 'percent', value: 20, minSubtotal: 2500, endsAt: '2026-12-01T00:00:00Z' }
    const created = await browser.post('/api/pricing/coupons', input)
    expect(created.status).toBe(201)
    expect(callsTo('POST', '/api/admin/coupons')[0]?.body).toEqual(input)

    const removed = await browser.request(`/api/pricing/coupons/${coupon.code}`, { method: 'DELETE' })
    expect(removed.status).toBe(204)
    expect((await browser.request('/api/pricing/coupons/NOPE', { method: 'DELETE' })).status).toBe(404)
  })

  it('rejects invalid coupons before calling pricing and passes a duplicate code through', async () => {
    const browser = await signedIn()

    for (const body of [
      { code: 'lowercase', type: 'percent', value: 10 },
      { code: 'HALF', type: 'percent', value: 150 },
      { code: 'FREE', type: 'fixed', value: 0 },
    ]) {
      expect((await browser.post('/api/pricing/coupons', body)).status).toBe(400)
    }
    expect(upstream.calls).toHaveLength(0)

    const duplicate = await browser.post('/api/pricing/coupons', { code: coupon.code, type: 'percent', value: 10 })
    expect(duplicate.status).toBe(422)
  })
})

describe('orders', () => {
  it('lists orders with the admin token, forwarding filters and dropping unknown ones', async () => {
    const browser = await signedIn()

    const response = await browser.request('/api/orders?status=placed&q=SW-0&page=2&sort=total')

    expect(response.status).toBe(200)
    expect((await response.json()).data.map((summary: { number: string }) => summary.number)).toEqual([order.number])
    const call = callsTo('GET', '/api/admin/orders')[0]!
    expect(Object.fromEntries(call.query)).toEqual({ status: 'placed', q: 'SW-0', page: '2' })
    expect(call.headers.authorization).toBe(`Bearer access-${lastIssued()}`)
  })

  it('filters by the cancelled status and rejects an unknown one without calling orders', async () => {
    const browser = await signedIn()

    expect((await browser.request('/api/orders?status=cancelled')).status).toBe(200)
    expect(callsTo('GET', '/api/admin/orders')[0]!.query.get('status')).toBe('cancelled')
    upstream.calls.length = 0
    expect((await browser.request('/api/orders?status=refunded')).status).toBe(400)
    expect(upstream.calls).toHaveLength(0)
  })

  it('shows an order and passes a missing one through as 404', async () => {
    const browser = await signedIn()

    const response = await browser.request(`/api/orders/${order.id}`)
    expect((await response.json()).data).toMatchObject({ number: order.number, status: 'placed', shipment: null })
    expect((await browser.request('/api/orders/missing')).status).toBe(404)
  })

  it('marks an order shipped, accepts the same shipment again and passes a conflicting one through', async () => {
    const browser = await signedIn()
    const shipment = { carrier: 'UPS', trackingNumber: '1Z999' }

    const first = await browser.request(`/api/orders/${order.id}/shipment`, { method: 'PUT', body: shipment })
    expect(first.status).toBe(200)
    expect((await first.json()).data).toMatchObject({ status: 'shipped', shipment })
    expect(callsTo('PUT', `/api/admin/orders/${order.id}/shipment`)[0]?.body).toEqual(shipment)

    const again = await browser.request(`/api/orders/${order.id}/shipment`, { method: 'PUT', body: shipment })
    expect(again.status).toBe(200)

    const other = await browser.request(`/api/orders/${order.id}/shipment`, {
      method: 'PUT',
      body: { carrier: 'DHL', trackingNumber: 'X' },
    })
    expect(other.status).toBe(409)
    expect((await other.json()).statusMessage).toMatch(/already shipped/)
  })

  it('rejects a blank carrier before calling orders', async () => {
    const browser = await signedIn()

    const response = await browser.request(`/api/orders/${order.id}/shipment`, {
      method: 'PUT',
      body: { carrier: ' ', trackingNumber: '1Z' },
    })

    expect(response.status).toBe(400)
    expect(upstream.calls).toHaveLength(0)
  })
})

describe('inventory', () => {
  it('lists stock levels, forwarding the SKU prefix and the low-stock threshold', async () => {
    const browser = await signedIn()

    const response = await browser.request('/api/inventory/stock?q=TEE&lowStock=5&perPage=50')

    expect(response.status).toBe(200)
    expect((await response.json()).data[0]).toMatchObject({ sku: 'TEE-BLK-M', onHand: 50, reserved: 2, available: 48 })
    expect(Object.fromEntries(callsTo('GET', '/api/admin/stock')[0]!.query)).toEqual({
      q: 'TEE',
      lowStock: '5',
      perPage: '50',
    })
  })

  it('shows a SKU with its reservations and passes an unknown one through as 404', async () => {
    const browser = await signedIn()

    const response = await browser.request('/api/inventory/stock/TEE-BLK-M')
    expect((await response.json()).data.reservations).toHaveLength(1)
    expect((await browser.request('/api/inventory/stock/NOPE')).status).toBe(404)
  })

  it('sets the on-hand count and passes the reserved-units 422 through with its field error', async () => {
    const browser = await signedIn()

    const response = await browser.request('/api/inventory/stock/TEE-BLK-M', { method: 'PUT', body: { onHand: 12 } })
    expect(response.status).toBe(200)
    expect((await response.json()).data).toMatchObject({ onHand: 12, available: 10 })
    expect(callsTo('PUT', '/api/admin/stock/TEE-BLK-M')[0]?.body).toEqual({ onHand: 12 })

    const below = await browser.request('/api/inventory/stock/TEE-BLK-M', { method: 'PUT', body: { onHand: 1 } })
    expect(below.status).toBe(422)
    expect((await below.json()).data.errors.onHand).toHaveLength(1)
  })

  it('rejects a negative or fractional count before calling inventory', async () => {
    const browser = await signedIn()

    for (const onHand of [-1, 2.5, '3']) {
      const response = await browser.request('/api/inventory/stock/TEE-BLK-M', { method: 'PUT', body: { onHand } })
      expect(response.status).toBe(400)
    }
    expect(upstream.calls).toHaveLength(0)
  })
})

describe('token refresh', () => {
  it('refreshes once and retries when a service answers 401', async () => {
    const browser = await signedIn()
    const n = lastIssued()
    state.rejectedAccess.add(`access-${n}`)

    const response = await browser.request('/api/pricing/coupons')

    expect(response.status).toBe(200)
    expect(callsTo('POST', '/api/tokens/refresh').map((call) => call.body)).toEqual([{ refreshToken: `refresh-${n}` }])
    expect(callsTo('GET', '/api/admin/coupons').map((call) => call.headers.authorization)).toEqual([
      `Bearer access-${n}`,
      `Bearer access-${n + 1}`,
    ])

    // The new pair was stored: the next request uses it without refreshing again.
    upstream.calls.length = 0
    await browser.request('/api/pricing/coupons')
    expect(callsTo('POST', '/api/tokens/refresh')).toHaveLength(0)
    expect(callsTo('GET', '/api/admin/coupons')[0]?.headers.authorization).toBe(`Bearer access-${n + 1}`)
  })

  it('shares one refresh between concurrent requests and late requests with the old cookie', async () => {
    state.accessTtl = 0
    const browser = await signedIn()
    const oldCookie = browser.cookie
    state.accessTtl = 900
    state.refreshDelayMs = 300

    const responses = await Promise.all(
      [1, 2, 3].map(() => browser.request('/api/pricing/coupons', { cookie: oldCookie })),
    )
    const late = await browser.request('/api/pricing/coupons', { cookie: oldCookie })

    for (const response of [...responses, late]) {
      expect(response.status).toBe(200)
    }
    expect(callsTo('POST', '/api/tokens/refresh')).toHaveLength(1)
    expect(state.reusedRefreshTokens).toEqual([])
    expect((await browser.session()).user?.email).toBe(admin.email)
  })

  it('refreshes on page requests, so SSR renders do not spend the token without storing the new one', async () => {
    state.accessTtl = 0
    const browser = await signedIn()
    state.accessTtl = 900
    const before = browser.cookie

    const page = await browser.request('/coupons')

    expect(page.status).toBe(200)
    expect(callsTo('POST', '/api/tokens/refresh')).toHaveLength(1)
    expect(browser.cookie).not.toBe(before)
    expect(state.reusedRefreshTokens).toEqual([])
  })

  it('signs the admin out when identity rejects the refresh token', async () => {
    state.accessTtl = 0
    const browser = await signedIn()
    state.refreshFails = true

    const response = await browser.request('/api/pricing/coupons')

    expect(response.status).toBe(401)
    expect(callsTo('GET', '/api/admin/coupons')).toHaveLength(0)
    expect((await browser.session()).user).toBeUndefined()
  })

  it('signs the admin out at the next refresh once the admin role is gone, and revokes the new token', async () => {
    state.accessTtl = 0
    const browser = await signedIn()
    state.demoted.add(admin.id)

    const response = await browser.request('/api/pricing/coupons')

    expect(response.status).toBe(401)
    expect(callsTo('GET', '/api/admin/coupons')).toHaveLength(0)
    expect(state.revoked).toEqual([`refresh-${lastIssued()}`])
    expect((await browser.session()).user).toBeUndefined()
  })

  it('redirects a signed-out page request to the sign-in page', async () => {
    const response = await fetch('/coupons', { redirect: 'manual' })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/login?redirect=/coupons')
  })
})
