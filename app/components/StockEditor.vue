<script setup lang="ts">
import type { StockLevel } from '#shared/types/contracts'

const props = defineProps<{ level: StockLevel }>()
const emit = defineEmits<{ updated: [level: StockLevel] }>()

const toast = useToast()
const input = ref(String(props.level.onHand))
const saving = ref(false)
watch(
  () => props.level.onHand,
  (onHand) => (input.value = String(onHand)),
)

async function save() {
  const parsed = stockInputSchema.safeParse({ onHand: /^\d+$/.test(input.value.trim()) ? Number(input.value) : NaN })
  if (!parsed.success) {
    toast.add({ title: 'Enter a whole number of units.', color: 'error', icon: 'i-lucide-circle-alert' })

    return
  }
  saving.value = true
  try {
    const updated = await setStock(props.level.sku, parsed.data.onHand)
    emit('updated', updated)
    toast.add({ title: `${updated.sku}: ${updated.onHand} on hand`, icon: 'i-lucide-check' })
  } catch (error) {
    // Inventory refuses a count below what open reservations hold (422 on onHand).
    toast.add({
      title: errorMessageOf(error, 'Could not set the stock.'),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="flex gap-1" data-test="stock-form" @submit.prevent="save">
    <UInput v-model="input" :aria-label="`On hand for ${level.sku}`" inputmode="numeric" size="sm" class="w-24" />
    <UButton
      type="submit"
      size="sm"
      color="neutral"
      variant="outline"
      label="Set"
      :aria-label="`Set stock of ${level.sku}`"
      :loading="saving"
    />
  </form>
</template>
