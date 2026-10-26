<script setup lang="ts">
import type { Variant } from '#shared/types/contracts'

const props = defineProps<{ variants: Variant[] }>()
const emit = defineEmits<{ updated: [variant: Variant] }>()

const toast = useToast()
const skus = computed(() => props.variants.map((variant) => variant.sku))
const { data: prices, refresh: refreshPrices } = await usePrices(skus)

// What the admin is typing, per variant id / SKU, until they save it.
const names = reactive(new Map<string, string>())
const priceInputs = reactive(new Map<string, string>())
const busy = ref<string>()

const nameOf = (variant: Variant) => names.get(variant.id) ?? variant.name
const priceInputOf = (variant: Variant) => {
  const current = prices.value[variant.sku]

  return priceInputs.get(variant.sku) ?? (current ? toMoneyInput(current.amount, current.currency) : '')
}

async function run(key: string, action: () => Promise<void>, failure: string) {
  busy.value = key
  try {
    await action()
  } catch (error) {
    toast.add({ title: errorMessageOf(error, failure), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = undefined
  }
}

const saveName = (variant: Variant) =>
  run(
    `name-${variant.id}`,
    async () => {
      const updated = await updateVariant(variant.id, { name: nameOf(variant).trim() })
      names.delete(variant.id)
      emit('updated', updated)
      toast.add({ title: `Renamed ${updated.sku}`, icon: 'i-lucide-check' })
    },
    'Could not rename the variant.',
  )

const toggleActive = (variant: Variant, active: boolean) =>
  run(
    `active-${variant.id}`,
    async () => {
      const updated = await updateVariant(variant.id, { active })
      emit('updated', updated)
      toast.add({ title: `${updated.sku} is ${updated.active ? 'active' : 'inactive'}`, icon: 'i-lucide-check' })
    },
    'Could not change the variant.',
  )

const savePrice = (variant: Variant) =>
  run(
    `price-${variant.sku}`,
    async () => {
      const amount = parseMoney(priceInputOf(variant), 'USD')
      if (amount === null) {
        throw createError({ statusMessage: 'Enter a price like 45.00.' })
      }
      const price = await setPrice(variant.sku, amount)
      priceInputs.delete(variant.sku)
      await refreshPrices()
      toast.add({ title: `${price.sku} costs ${formatMoney(price.amount, price.currency)}`, icon: 'i-lucide-check' })
    },
    'Could not set the price.',
  )
</script>

<template>
  <table class="w-full text-sm" data-test="variants">
    <thead class="text-left text-muted">
      <tr>
        <th class="py-2 font-medium">SKU</th>
        <th class="py-2 font-medium">Name</th>
        <th class="py-2 font-medium">Options</th>
        <th class="py-2 font-medium">Active</th>
        <th class="py-2 font-medium">Price (USD)</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-default">
      <tr v-for="variant in variants" :key="variant.id" :data-sku="variant.sku">
        <td class="py-2 pr-2 font-mono">{{ variant.sku }}</td>
        <td class="py-2 pr-2">
          <form class="flex gap-1" @submit.prevent="saveName(variant)">
            <UInput
              :model-value="nameOf(variant)"
              :aria-label="`Name of ${variant.sku}`"
              size="sm"
              @update:model-value="names.set(variant.id, String($event))"
            />
            <UButton
              v-if="nameOf(variant) !== variant.name"
              type="submit"
              size="sm"
              label="Save"
              :loading="busy === `name-${variant.id}`"
            />
          </form>
        </td>
        <td class="py-2 pr-2 text-muted">{{ formatOptions(variant.options) || '—' }}</td>
        <td class="py-2 pr-2">
          <USwitch
            :model-value="variant.active"
            :aria-label="`${variant.sku} active`"
            :loading="busy === `active-${variant.id}`"
            @update:model-value="toggleActive(variant, $event)"
          />
        </td>
        <td class="py-2">
          <form class="flex gap-1" data-test="price-form" @submit.prevent="savePrice(variant)">
            <UInput
              :model-value="priceInputOf(variant)"
              :aria-label="`Price of ${variant.sku}`"
              placeholder="Not priced"
              size="sm"
              class="w-28"
              @update:model-value="priceInputs.set(variant.sku, String($event))"
            />
            <UButton
              type="submit"
              size="sm"
              color="neutral"
              variant="outline"
              label="Set"
              :aria-label="`Set price of ${variant.sku}`"
              :loading="busy === `price-${variant.sku}`"
            />
          </form>
        </td>
      </tr>
    </tbody>
  </table>
</template>
