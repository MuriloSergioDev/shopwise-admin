export default defineEventHandler(async (event) => {
  const tokens = (await getUserSession(event)).secure?.tokens
  if (tokens) {
    await revokeRefreshToken(event, tokens.refreshToken)
  }
  await clearUserSession(event)
  setResponseStatus(event, 204)

  return null
})
