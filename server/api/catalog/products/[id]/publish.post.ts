import { z } from 'zod'
import type { Product } from '#shared/types/contracts'

const params = z.object({ id: z.string().min(1).max(64) })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: Product }>(event, 'catalog', `/api/admin/products/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
      token,
    }),
  )
})
