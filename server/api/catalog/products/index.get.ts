import { z } from 'zod'
import type { AdminProductPage } from '#shared/types/contracts'

// Drafts included: catalog's admin listing, not the storefront search.
const filters = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(['draft', 'published']).optional(),
  category: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const query = compactQuery(await getValidatedQuery(event, filters.parse))

  return asAdmin(event, (token) =>
    serviceFetch<AdminProductPage>(event, 'catalog', '/api/admin/products', { token, query }),
  )
})
