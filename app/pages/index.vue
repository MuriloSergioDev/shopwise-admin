<script setup lang="ts">
useSeoMeta({ title: 'Overview · Shopwise admin' })

const { user } = useAuth()

const areas = [
  {
    title: 'Products',
    description: 'Create drafts, publish them, edit variants and set prices.',
    icon: 'i-lucide-shirt',
    to: '/products',
  },
  {
    title: 'Coupons',
    description: 'Create coupons and deactivate old ones.',
    icon: 'i-lucide-ticket-percent',
    to: '/coupons',
  },
  { title: 'Orders', description: 'Not wired yet: waits for the orders admin API (P3).', icon: 'i-lucide-receipt' },
  {
    title: 'Inventory',
    description: 'Not wired yet: waits for the inventory admin API (P3).',
    icon: 'i-lucide-warehouse',
  },
]
</script>

<template>
  <UDashboardPanel id="overview">
    <template #header>
      <PageNavbar title="Overview" />
    </template>

    <template #body>
      <p class="text-muted">Signed in as {{ user?.email }}.</p>
      <UPageGrid class="lg:grid-cols-2">
        <UPageCard
          v-for="area in areas"
          :key="area.title"
          :title="area.title"
          :description="area.description"
          :icon="area.icon"
          :to="area.to"
          :class="{ 'opacity-60': !area.to }"
        />
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>
