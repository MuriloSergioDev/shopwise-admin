import { z } from 'zod'
import type { Price } from '#shared/types/contracts'

const params = z.object({ sku: skuSchema })

export default defineEventHandler(async (event) => {
  const { sku } = await getValidatedRouterParams(event, params.parse)
  const body = await readValidatedBody(event, priceInputSchema.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: Price }>(event, 'pricing', `/api/admin/prices/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      body,
      token,
    }),
  )
})
