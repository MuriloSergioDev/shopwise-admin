import { z } from 'zod'
import type { Product } from '#shared/types/contracts'

// Catalog has no admin read yet: this is the public detail by slug, so only published products with their
// active variants are found.
const params = z.object({ id: z.string().min(1).max(200) })

export default defineEventHandler(async (event) => {
  const { id: slug } = await getValidatedRouterParams(event, params.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: Product }>(event, 'catalog', `/api/products/${encodeURIComponent(slug)}`, { token }),
  )
})
