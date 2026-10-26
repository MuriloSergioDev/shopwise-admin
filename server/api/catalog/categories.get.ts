import type { Category } from '#shared/types/contracts'

export default defineEventHandler((event) =>
  asAdmin(event, (token) => serviceFetch<{ data: Category[] }>(event, 'catalog', '/api/categories', { token })),
)
