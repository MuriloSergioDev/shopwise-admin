/** BFF routes anyone may call: signing in and out, and nuxt-auth-utils' session endpoint. */
const OPEN_API = ['/api/auth/', '/api/_auth/']

/**
 * Two jobs, on every request:
 *
 * - Every other `/api/*` route is admin-only. Checking here, before any handler runs, means a route added later
 *   cannot forget it (handlers still call services through asAdmin, which does the same check).
 * - Pages refresh the access token before it expires. During SSR, `useFetch` calls the BFF internally and the
 *   Set-Cookie of those internal responses never reaches the browser, so the new cookie has to go on the page
 *   response; the internal calls (still carrying the old cookie) get the same pair from the refresh coordinator.
 */
export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]!
  if (path.startsWith('/_nuxt/') || OPEN_API.some((prefix) => path.startsWith(prefix))) {
    return
  }

  if (path.startsWith('/api/')) {
    // Identity being down surfaces as a 502 from adminTokens.
    if (!(await adminTokens(event))) {
      throw signInAgain()
    }

    return
  }

  const name = (useRuntimeConfig(event).session as { name?: string } | undefined)?.name ?? 'nuxt-session'
  if (getCookie(event, name)) {
    // Identity being down is not the page's problem: its API calls fail on their own.
    await adminTokens(event).catch(() => undefined)
  }
})
