import type { CouponInput, Price } from '#shared/types/contracts'

/** Current prices of `skus`, keyed by SKU. SKUs without a price are missing from the map. */
export function usePrices(skus: MaybeRefOrGetter<string[]>) {
  return useAsyncData(
    () => `pricing-prices-${toValue(skus).join(',')}`,
    async () => {
      const list = toValue(skus)
      if (list.length === 0) {
        return {}
      }
      const { data } = await $fetch('/api/pricing/prices', { query: { 'skus[]': list } })

      return Object.fromEntries(data.map((price) => [price.sku, price])) as Record<string, Price>
    },
    { default: () => ({}) as Record<string, Price> },
  )
}

export async function setPrice(sku: string, amount: number) {
  const { data } = await $fetch(`/api/pricing/prices/${encodeURIComponent(sku)}`, {
    method: 'PUT',
    body: { amount, currency: 'USD' },
  })

  return data
}

export function useCoupons() {
  return useFetch('/api/pricing/coupons', {
    key: 'pricing-coupons',
    transform: (response) => response.data,
    default: () => [],
  })
}

export async function createCoupon(input: CouponInput) {
  const { data } = await $fetch('/api/pricing/coupons', { method: 'POST', body: input })

  return data
}

export async function deactivateCoupon(code: string) {
  await $fetch(`/api/pricing/coupons/${encodeURIComponent(code)}`, { method: 'DELETE' })
}
