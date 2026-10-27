<script setup lang="ts">
import type { StockLevel } from '#shared/types/contracts'

const route = useRoute()
const sku = computed(() => String(route.params.sku))
const { data: level, error, refresh } = await useStockLevel(sku)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Inventory does not know that SKU.', fatal: true })
}

useSeoMeta({ title: () => `${sku.value} · Inventory · Shopwise admin` })

// The PUT answers without reservations; reload the detail so the list stays complete.
async function updated(_level: StockLevel) {
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="stock-level">
    <template #header>
      <PageNavbar :title="sku" />
    </template>

    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" :title="errorMessageOf(error, 'Could not load the SKU.')" />

      <template v-if="level">
        <div class="grid gap-4 sm:grid-cols-3" data-test="levels">
          <UPageCard title="On hand" :description="String(level.onHand)" variant="subtle" />
          <UPageCard title="Reserved" :description="String(level.reserved)" variant="subtle" />
          <UPageCard title="Available" :description="String(level.available)" variant="subtle" />
        </div>

        <UPageCard
          title="Stock count"
          description="Set what is physically on hand, reservations included."
          variant="subtle"
        >
          <StockEditor :level="level" @updated="updated" />
        </UPageCard>

        <UPageCard title="Open reservations" variant="subtle">
          <table v-if="level.reservations.length" class="w-full text-sm" data-test="reservations">
            <thead class="text-left text-muted">
              <tr>
                <th class="py-2 font-medium">Checkout</th>
                <th class="py-2 text-right font-medium">Units</th>
                <th class="py-2 pl-6 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="reservation in level.reservations" :key="reservation.id">
                <td class="py-2 font-mono">{{ reservation.checkoutId }}</td>
                <td class="py-2 text-right">{{ reservation.quantity }}</td>
                <td class="py-2 pl-6 text-muted">{{ new Date(reservation.expiresAt).toLocaleString('en-US') }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-muted">No open reservations.</p>
        </UPageCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
