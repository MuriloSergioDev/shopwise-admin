import { z } from 'zod'
import type { Order } from '#shared/types/contracts'

const params = z.object({ id: z.string().min(1).max(64) })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: Order }>(event, 'orders', `/api/admin/orders/${encodeURIComponent(id)}`, { token }),
  )
})
