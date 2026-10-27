<script setup lang="ts">
import type { OrderStatus } from '#shared/types/contracts'

const props = defineProps<{ status: OrderStatus }>()

const look = computed(
  () =>
    ({
      placed: { label: 'To ship', color: 'warning' },
      shipped: { label: 'Shipped', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'error' },
    })[props.status] as { label: string; color: 'warning' | 'success' | 'error' },
)
</script>

<template>
  <UBadge :label="look.label" :color="look.color" variant="subtle" />
</template>
