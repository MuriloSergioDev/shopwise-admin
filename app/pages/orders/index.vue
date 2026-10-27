<script setup lang="ts">
useSeoMeta({ title: 'Orders · Shopwise admin' })

const route = useRoute()
const router = useRouter()

// All list state lives in the URL query, so a reload or a shared link shows the same page.
const status = computed(() =>
  route.query.status === 'placed' || route.query.status === 'shipped' ? route.query.status : undefined,
)
const query = computed(() => ({
  ...(status.value ? { status: status.value } : {}),
  ...(typeof route.query.q === 'string' && route.query.q !== '' ? { q: route.query.q } : {}),
  page: Number(route.query.page) || 1,
  perPage: 25,
}))
const { data: result, status: fetchStatus, error } = await useOrderList(query)

const statusItems = [
  { label: 'All', value: 'all' },
  { label: 'To ship', value: 'placed' },
  { label: 'Shipped', value: 'shipped' },
]
const statusFilter = computed({
  get: () => status.value ?? 'all',
  set: (value: string) => {
    const { status: _status, page: _page, ...rest } = route.query
    router.push({ query: value === 'all' ? rest : { ...rest, status: value } })
  },
})

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
function submitSearch() {
  const { q: _q, page: _page, ...rest } = route.query
  router.push({ query: search.value.trim() === '' ? rest : { ...rest, q: search.value.trim() } })
}
const page = computed({
  get: () => query.value.page,
  set: (value: number) => router.push({ query: { ...route.query, page: String(value) } }),
})
</script>

<template>
  <UDashboardPanel id="orders">
    <template #header>
      <PageNavbar title="Orders" />
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-2">
        <UTabs v-model="statusFilter" :items="statusItems" :content="false" size="sm" />
        <form class="flex flex-1 gap-2" @submit.prevent="submitSearch">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Order number or email" class="max-w-sm flex-1" />
          <UButton type="submit" color="neutral" variant="outline" label="Search" />
        </form>
      </div>

      <UAlert v-if="error" color="error" variant="subtle" :title="errorMessageOf(error, 'Could not load orders.')" />

      <table v-else class="w-full text-sm" data-test="orders">
        <thead class="text-left text-muted">
          <tr>
            <th class="py-2 font-medium">Order</th>
            <th class="py-2 font-medium">Customer</th>
            <th class="py-2 font-medium">Items</th>
            <th class="py-2 font-medium">Total</th>
            <th class="py-2 font-medium">Placed</th>
            <th class="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="order in result?.data ?? []" :key="order.id" :data-order="order.number">
            <td class="py-2">
              <ULink :to="`/orders/${order.id}`" class="font-mono font-medium text-highlighted">{{
                order.number
              }}</ULink>
            </td>
            <td class="py-2">{{ order.email }}</td>
            <td class="py-2">{{ order.itemCount }}</td>
            <td class="py-2">{{ formatMoney(order.total, order.currency) }}</td>
            <td class="py-2 text-muted">{{ new Date(order.placedAt).toLocaleString('en-US') }}</td>
            <td class="py-2"><OrderStatusBadge :status="order.status" /></td>
          </tr>
          <tr v-if="fetchStatus === 'success' && (result?.data.length ?? 0) === 0">
            <td colspan="6" class="py-6 text-center text-muted">No orders found.</td>
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
