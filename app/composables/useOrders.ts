import type { LocationQuery } from 'vue-router'

/** Orders matching `query` (usually `route.query`), newest first; refetches when it changes. */
export function useOrderList(query: MaybeRefOrGetter<LocationQuery | Record<string, string | number>>) {
  return useFetch('/api/orders', {
    key: 'orders-list',
    query: computed(() => toValue(query)),
  })
}

export function useOrder(id: MaybeRefOrGetter<string>) {
  return useFetch(() => `/api/orders/${encodeURIComponent(toValue(id))}`, {
    key: () => `order-${toValue(id)}`,
    transform: (response) => response.data,
  })
}

export async function markShipped(id: string, shipment: { carrier: string; trackingNumber: string }) {
  const { data } = await $fetch(`/api/orders/${encodeURIComponent(id)}/shipment`, { method: 'PUT', body: shipment })

  return data
}
