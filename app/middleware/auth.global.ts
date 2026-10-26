// Every page but /login is for signed-in admins. This only steers navigation: the BFF checks the role itself on
// every API request (server/middleware/admin-session.ts).
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  const signedIn = loggedIn.value && (user.value?.roles.includes('admin') ?? false)

  if (to.path === '/login') {
    return signedIn ? navigateTo('/') : undefined
  }
  if (!signedIn) {
    return navigateTo({ path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } })
  }
})
