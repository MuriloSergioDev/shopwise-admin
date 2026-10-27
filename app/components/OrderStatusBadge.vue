<script setup lang="ts">
import type { OrderStatus } from '#shared/types/contracts'

defineProps<{ status: OrderStatus }>()
</script>

<template>
  <UBadge
    :label="status === 'shipped' ? 'Shipped' : 'To ship'"
    :color="status === 'shipped' ? 'success' : 'warning'"
    variant="subtle"
  />
</template>
