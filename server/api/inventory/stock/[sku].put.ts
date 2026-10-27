import { z } from 'zod'
import type { StockLevel } from '#shared/types/contracts'

const params = z.object({ sku: skuSchema })

// A stock count, not a delta: inventory sets onHand to this number (so asAdmin's retry is safe).
export default defineEventHandler(async (event) => {
  const { sku } = await getValidatedRouterParams(event, params.parse)
  const body = await readValidatedBody(event, stockInputSchema.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: StockLevel }>(event, 'inventory', `/api/admin/stock/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      body,
      token,
    }),
  )
})
