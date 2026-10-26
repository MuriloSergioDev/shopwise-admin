import type { H3Event } from 'h3'
import type { SecureSessionData, User } from '#auth-utils'
import type { Customer, TokenPair } from '#shared/types/contracts'

/** Refresh when the access token has less than this left, so it does not expire on its way to a service. */
const EXPIRY_SKEW_MS = 30_000

export const NOT_AN_ADMIN = 'This account is not an admin.'

interface Refreshed {
  pair: TokenPair
  /** The account behind the new token, or null when identity could not be asked (the stored user stays). */
  account: Customer | null
}

// One exchange per refresh token across all requests in this process (see refresh-coordinator.ts).
const coordinator = createRefreshCoordinator<Refreshed>({
  graceMs: 30_000,
  isRetryable: (error) => statusOf(error) !== 401,
})

interface SessionData {
  user?: User
  secure?: SecureSessionData
  [key: string]: unknown
}

export const isAdmin = (account: { roles: readonly string[] } | undefined): boolean =>
  account?.roles.includes('admin') ?? false

/** The session's data without the `id` getUserSession adds, ready to write back. */
async function sessionData(event: H3Event): Promise<SessionData> {
  const { id: _id, ...data } = await getUserSession(event)

  return data
}

const toUser = (account: Customer): User => ({
  id: account.id,
  email: account.email,
  name: account.name,
  roles: account.roles,
})

/** Revoking is best effort: access tokens expire on their own. */
export async function revokeRefreshToken(event: H3Event, refreshToken: string): Promise<void> {
  await serviceFetch(event, 'identity', '/api/tokens/revoke', { method: 'POST', body: { refreshToken } }).catch(
    () => undefined,
  )
}

/**
 * Signs an admin in with a fresh token pair. Anyone without the `admin` role gets a 403 and no session, and their
 * new refresh token is revoked so it does not stay valid somewhere nobody holds it.
 */
export async function startAdminSession(event: H3Event, pair: TokenPair): Promise<Customer> {
  const { data: account } = await serviceFetch<{ data: Customer }>(event, 'identity', '/api/me', {
    token: pair.accessToken,
  })
  if (!isAdmin(account)) {
    await revokeRefreshToken(event, pair.refreshToken)
    throw createError({ statusCode: 403, statusMessage: NOT_AN_ADMIN })
  }

  await replaceUserSession(event, {
    user: toUser(account),
    secure: { tokens: toSessionTokens(pair, Date.now()) },
    loggedInAt: Date.now(),
  })

  return account
}

/**
 * Drops the admin from the session.
 *
 * Not clearUserSession: h3 forgets a cleared session, so the next read in the same request (the SSR render's
 * session fetch, say) unseals the request's cookie again and the admin comes back. replaceUserSession merges
 * top-level keys into the request cookie's data, so every key is overwritten explicitly.
 */
export async function endAdminSession(event: H3Event): Promise<void> {
  await replaceUserSession(event, { user: undefined, secure: undefined, loggedInAt: undefined })
}

/**
 * The signed-in admin's tokens, refreshed first when the access token is (nearly) expired or `force` is set (a
 * service answered 401). Returns null when nobody (or no admin) is signed in.
 *
 * Every refresh also asks identity who the token belongs to, so an account that lost the `admin` role is signed
 * out at its next refresh at the latest (services check the role on every call anyway). When identity rejects
 * the refresh token the session ends here; other refresh failures (identity down) are thrown.
 */
export async function adminTokens(event: H3Event, options: { force?: boolean } = {}): Promise<SessionTokens | null> {
  const session = await sessionData(event)
  const tokens = session.secure?.tokens
  if (!session.user || !tokens || !isAdmin(session.user)) {
    return null
  }
  if (!options.force && tokens.accessExpiresAt - Date.now() > EXPIRY_SKEW_MS) {
    return tokens
  }

  let refreshed: Refreshed
  try {
    refreshed = await coordinator.refresh(tokens.refreshToken, async (refreshToken) => {
      const { data: pair } = await serviceFetch<{ data: TokenPair }>(event, 'identity', '/api/tokens/refresh', {
        method: 'POST',
        body: { refreshToken },
      })
      // The old refresh token is spent now: failing here would lose the new pair, so a failed lookup keeps it.
      const account = await serviceFetch<{ data: Customer }>(event, 'identity', '/api/me', {
        token: pair.accessToken,
      }).then(
        (response) => response.data,
        () => null,
      )
      if (account && !isAdmin(account)) {
        await revokeRefreshToken(event, pair.refreshToken)
      }

      return { pair, account }
    })
  } catch (error) {
    if (statusOf(error) === 401) {
      await endAdminSession(event)

      return null
    }
    throw error
  }

  if (refreshed.account && !isAdmin(refreshed.account)) {
    await endAdminSession(event)

    return null
  }

  const next = toSessionTokens(refreshed.pair, Date.now())
  await replaceUserSession(event, {
    ...session,
    user: refreshed.account ? toUser(refreshed.account) : session.user,
    secure: { ...session.secure, tokens: next },
  })

  return next
}

/**
 * Runs a service call with the admin's access token. A 401 gets one forced refresh and a retry, so `call` must be
 * safe to repeat. Without a signed-in admin (or when the refresh fails) the request fails with 401.
 */
export async function asAdmin<T>(event: H3Event, call: (token: string) => Promise<T>): Promise<T> {
  const tokens = await adminTokens(event)
  if (!tokens) {
    throw signInAgain()
  }

  try {
    return await call(tokens.accessToken)
  } catch (error) {
    if (statusOf(error) !== 401) {
      throw error
    }
    const fresh = await adminTokens(event, { force: true })
    if (!fresh) {
      throw signInAgain()
    }

    return call(fresh.accessToken)
  }
}

export const signInAgain = () => createError({ statusCode: 401, statusMessage: 'Sign in as an admin to continue.' })
