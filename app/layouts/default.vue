<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <ULink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
          <UIcon name="i-lucide-store" class="size-5 text-primary" />
          <span v-if="!collapsed">Shopwise admin</span>
        </ULink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="navigationItems" orientation="vertical" tooltip />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
