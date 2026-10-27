import { z } from 'zod'
import type { Order } from '#shared/types/contracts'

const params = z.object({ id: z.string().min(1).max(64) })

// Orders treats a repeat with the same carrier and tracking number as a no-op, so asAdmin's retry is safe.
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, params.parse)
  const body = await readValidatedBody(event, shipmentInputSchema.parse)

  return asAdmin(event, (token) =>
    serviceFetch<{ data: Order }>(event, 'orders', `/api/admin/orders/${encodeURIComponent(id)}/shipment`, {
      method: 'PUT',
      body,
      token,
    }),
  )
})
