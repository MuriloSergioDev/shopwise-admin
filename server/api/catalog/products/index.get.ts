import { z } from 'zod'
import type { ProductSearchResult } from '#shared/types/contracts'

// Catalog has no admin listing yet: this is the public search, so it only shows published products.
const filters = z.object({
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(48).optional(),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, filters.parse)
  const defined = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''))

  return asAdmin(event, (token) =>
    serviceFetch<ProductSearchResult>(event, 'catalog', '/api/products', { token, query: defined }),
  )
})
