import type { LocationQuery } from 'vue-router'
import type { CreateProductInput, UpdateVariantInput } from '#shared/types/contracts'

export function useCategories() {
  return useFetch('/api/catalog/categories', {
    key: 'catalog-categories',
    transform: (response) => response.data,
    default: () => [],
  })
}

/** Published products matching `query` (usually `route.query`); refetches when it changes. */
export function useProductSearch(query: MaybeRefOrGetter<LocationQuery | Record<string, string | number>>) {
  return useFetch('/api/catalog/products', {
    key: 'catalog-product-search',
    query: computed(() => toValue(query)),
  })
}

export function useProduct(slug: MaybeRefOrGetter<string>) {
  return useFetch(() => `/api/catalog/products/${encodeURIComponent(toValue(slug))}`, {
    key: () => `catalog-product-${toValue(slug)}`,
    transform: (response) => response.data,
  })
}

export async function createProduct(input: CreateProductInput) {
  const { data } = await $fetch('/api/catalog/products', { method: 'POST', body: input })

  return data
}

export async function publishProduct(id: string) {
  const { data } = await $fetch(`/api/catalog/products/${encodeURIComponent(id)}/publish`, { method: 'POST' })

  return data
}

export async function updateVariant(id: string, changes: UpdateVariantInput) {
  const { data } = await $fetch(`/api/catalog/variants/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes })

  return data
}
