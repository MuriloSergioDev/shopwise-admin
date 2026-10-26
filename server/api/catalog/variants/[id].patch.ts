import { z } from 'zod'
import type { Variant } from '#shared/types/contracts'

const params = z.object({ id: z.string().min(1).max(64) })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse)
  const body = await readValidatedBody(event, variantUpdateSchema.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: Variant }>(event, 'catalog', `/api/admin/variants/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
      token,
    }),
  )
})
