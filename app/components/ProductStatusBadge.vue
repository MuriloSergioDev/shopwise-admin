<script setup lang="ts">
defineProps<{ status: 'draft' | 'published' }>()
</script>

<template>
  <UBadge
    :label="status === 'published' ? 'Published' : 'Draft'"
    :color="status === 'published' ? 'success' : 'neutral'"
    variant="subtle"
  />
</template>
