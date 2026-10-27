import { z } from 'zod'
import type { StockLevelPage } from '#shared/types/contracts'

const filters = z.object({
  q: z.string().max(64).optional(),
  lowStock: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const query = compactQuery(await getValidatedQuery(event, filters.parse))

  return asAdmin(event, (token) =>
    serviceFetch<StockLevelPage>(event, 'inventory', '/api/admin/stock', { token, query }),
  )
})
