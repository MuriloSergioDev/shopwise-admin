import type { LocationQuery } from 'vue-router'

/** Stock levels matching `query` (usually `route.query`), ordered by SKU; refetches when it changes. */
export function useStockLevels(query: MaybeRefOrGetter<LocationQuery | Record<string, string | number>>) {
  return useFetch('/api/inventory/stock', {
    key: 'inventory-stock',
    query: computed(() => toValue(query)),
  })
}

export function useStockLevel(sku: MaybeRefOrGetter<string>) {
  return useFetch(() => `/api/inventory/stock/${encodeURIComponent(toValue(sku))}`, {
    key: () => `inventory-stock-${toValue(sku)}`,
    transform: (response) => response.data,
  })
}

/** Sets the on-hand count (a stock count, not a delta). */
export async function setStock(sku: string, onHand: number) {
  const { data } = await $fetch(`/api/inventory/stock/${encodeURIComponent(sku)}`, {
    method: 'PUT',
    body: { onHand },
  })

  return data
}
