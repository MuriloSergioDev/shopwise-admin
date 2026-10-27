<script setup lang="ts">
import type { StockLevel } from '#shared/types/contracts'

useSeoMeta({ title: 'Inventory · Shopwise admin' })

const LOW_STOCK = 5

const route = useRoute()
const router = useRouter()

// All list state lives in the URL query, so a reload or a shared link shows the same page.
const lowOnly = computed(() => route.query.lowStock !== undefined)
const query = computed(() => ({
  ...(typeof route.query.q === 'string' && route.query.q !== '' ? { q: route.query.q } : {}),
  ...(lowOnly.value ? { lowStock: LOW_STOCK } : {}),
  page: Number(route.query.page) || 1,
  perPage: 50,
}))
const { data: result, status, error } = await useStockLevels(query)

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
function submitSearch() {
  const { q: _q, page: _page, ...rest } = route.query
  router.push({ query: search.value.trim() === '' ? rest : { ...rest, q: search.value.trim().toUpperCase() } })
}
const lowFilter = computed({
  get: () => lowOnly.value,
  set: (value: boolean) => {
    const { lowStock: _lowStock, page: _page, ...rest } = route.query
    router.push({ query: value ? { ...rest, lowStock: String(LOW_STOCK) } : rest })
  },
})
const page = computed({
  get: () => query.value.page,
  set: (value: number) => router.push({ query: { ...route.query, page: String(value) } }),
})

// useFetch data is a shallow ref: replace the page rather than mutating it.
function replaceLevel(updated: StockLevel) {
  if (result.value) {
    result.value = {
      ...result.value,
      data: result.value.data.map((level) => (level.sku === updated.sku ? updated : level)),
    }
  }
}
</script>

<template>
  <UDashboardPanel id="inventory">
    <template #header>
      <PageNavbar title="Inventory" />
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-4">
        <form class="flex flex-1 gap-2" @submit.prevent="submitSearch">
          <UInput v-model="search" icon="i-lucide-search" placeholder="SKU prefix" class="max-w-sm flex-1" />
          <UButton type="submit" color="neutral" variant="outline" label="Search" />
        </form>
        <USwitch v-model="lowFilter" :label="`Only ${LOW_STOCK} or fewer available`" />
      </div>

      <UAlert v-if="error" color="error" variant="subtle" :title="errorMessageOf(error, 'Could not load stock.')" />

      <table v-else class="w-full text-sm" data-test="stock">
        <thead class="text-left text-muted">
          <tr>
            <th class="py-2 font-medium">SKU</th>
            <th class="py-2 text-right font-medium">On hand</th>
            <th class="py-2 text-right font-medium">Reserved</th>
            <th class="py-2 text-right font-medium">Available</th>
            <th class="py-2 pl-6 font-medium">Count</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="level in result?.data ?? []" :key="level.sku" :data-sku="level.sku">
            <td class="py-2">
              <ULink :to="`/inventory/${encodeURIComponent(level.sku)}`" class="font-mono text-highlighted">
                {{ level.sku }}
              </ULink>
            </td>
            <td class="py-2 text-right">{{ level.onHand }}</td>
            <td class="py-2 text-right">{{ level.reserved }}</td>
            <td class="py-2 text-right" :class="{ 'font-medium text-warning': level.available <= LOW_STOCK }">
              {{ level.available }}
            </td>
            <td class="py-2 pl-6"><StockEditor :level="level" @updated="replaceLevel" /></td>
          </tr>
          <tr v-if="status === 'success' && (result?.data.length ?? 0) === 0">
            <td colspan="5" class="py-6 text-center text-muted">No SKUs found.</td>
          </tr>
        </tbody>
      </table>

      <UPagination
        v-if="result && result.meta.lastPage > 1"
        v-model:page="page"
        :total="result.meta.total"
        :items-per-page="result.meta.perPage"
      />
    </template>
  </UDashboardPanel>
</template>
