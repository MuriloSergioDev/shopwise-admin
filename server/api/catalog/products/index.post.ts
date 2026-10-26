import type { Product } from '#shared/types/contracts'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, productInputSchema.parse)
  const created = await asAdmin(event, (token) =>
    serviceFetch<{ data: Product }>(event, 'catalog', '/api/admin/products', { method: 'POST', body, token }),
  )
  setResponseStatus(event, 201)

  return created
})
