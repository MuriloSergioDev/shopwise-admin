import { z } from 'zod'
import type { OrderPage } from '#shared/types/contracts'

const filters = z.object({
  status: z.enum(['placed', 'shipped']).optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const query = compactQuery(await getValidatedQuery(event, filters.parse))

  return asAdmin(event, (token) => serviceFetch<OrderPage>(event, 'orders', '/api/admin/orders', { token, query }))
})
