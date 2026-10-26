import type { Coupon } from '#shared/types/contracts'

export default defineEventHandler((event) =>
  asAdmin(event, (token) => serviceFetch<{ data: Coupon[] }>(event, 'pricing', '/api/admin/coupons', { token })),
)
