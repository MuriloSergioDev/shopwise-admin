import type { Coupon } from '#shared/types/contracts'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, couponInputSchema.parse)
  const created = await asAdmin(event, (token) =>
    serviceFetch<{ data: Coupon }>(event, 'pricing', '/api/admin/coupons', { method: 'POST', body, token }),
  )
  setResponseStatus(event, 201)

  return created
})
