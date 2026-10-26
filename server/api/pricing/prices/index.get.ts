import { z } from 'zod'
import type { Price } from '#shared/types/contracts'

// `skus[]=a&skus[]=b`; h3 gives a single value as a string.
const query = z.object({
  'skus[]': z.union([skuSchema, z.array(skuSchema).min(1).max(100)]).transform((skus) => [skus].flat()),
})

export default defineEventHandler(async (event) => {
  const { 'skus[]': skus } = await getValidatedQuery(event, query.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: Price[] }>(event, 'pricing', '/api/prices', { token, query: { 'skus[]': skus } }),
  )
})
