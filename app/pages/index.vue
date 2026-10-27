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
  { title: 'Orders', description: 'Find orders and mark them shipped.', icon: 'i-lucide-receipt', to: '/orders' },
  {
    title: 'Inventory',
    description: 'Check stock levels and record stock counts.',
    icon: 'i-lucide-warehouse',
    to: '/inventory',
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
        />
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>
