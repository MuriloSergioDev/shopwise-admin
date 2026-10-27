import { z } from 'zod'
import type { StockLevelDetail } from '#shared/types/contracts'

const params = z.object({ sku: skuSchema })

export default defineEventHandler(async (event) => {
  const { sku } = await getValidatedRouterParams(event, params.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: StockLevelDetail }>(event, 'inventory', `/api/admin/stock/${encodeURIComponent(sku)}`, {
      token,
    }),
  )
})
