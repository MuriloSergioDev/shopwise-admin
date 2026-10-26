import { z } from 'zod'

const params = z.object({ code: z.string().min(1).max(32) })

// Pricing deactivates the coupon; it stays in the list with active=false.
export default defineEventHandler(async (event) => {
  const { code } = await getValidatedRouterParams(event, params.parse)
  await asAdmin(event, (token) =>
    serviceFetch(event, 'pricing', `/api/admin/coupons/${encodeURIComponent(code)}`, { method: 'DELETE', token }),
  )
  setResponseStatus(event, 204)

  return null
})
