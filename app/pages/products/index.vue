<script setup lang="ts">
useSeoMeta({ title: 'Products · Shopwise admin' })

const route = useRoute()
const router = useRouter()

// All list state lives in the URL query, so a reload or a shared link shows the same page.
const status = computed(() =>
  route.query.status === 'draft' || route.query.status === 'published' ? route.query.status : undefined,
)
const query = computed(() => ({
  ...(status.value ? { status: status.value } : {}),
  ...(typeof route.query.q === 'string' && route.query.q !== '' ? { q: route.query.q } : {}),
  page: Number(route.query.page) || 1,
  perPage: 25,
}))
const { data: result, status: fetchStatus, error } = await useProductList(query)

const statusItems = [
  { label: 'All', value: 'all' },
  { label: 'Drafts', value: 'draft' },
  { label: 'Published', value: 'published' },
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
  <UDashboardPanel id="products">
    <template #header>
      <PageNavbar title="Products">
        <template #right>
          <UButton to="/products/new" icon="i-lucide-plus" label="New product" />
        </template>
      </PageNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-2">
        <UTabs v-model="statusFilter" :items="statusItems" :content="false" size="sm" />
        <form class="flex flex-1 gap-2" @submit.prevent="submitSearch">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Name, slug or SKU" class="max-w-sm flex-1" />
          <UButton type="submit" color="neutral" variant="outline" label="Search" />
        </form>
      </div>

      <UAlert v-if="error" color="error" variant="subtle" :title="errorMessageOf(error, 'Could not load products.')" />

      <table v-else class="w-full text-sm" data-test="products">
        <thead class="text-left text-muted">
          <tr>
            <th class="py-2 font-medium">Name</th>
            <th class="py-2 font-medium">Status</th>
            <th class="py-2 font-medium">Variants</th>
            <th class="py-2 font-medium">Category</th>
            <th class="py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="product in result?.data ?? []" :key="product.id" :data-product="product.slug">
            <td class="py-2">
              <ULink :to="`/products/${product.id}`" class="font-medium text-highlighted">{{ product.name }}</ULink>
              <div class="font-mono text-xs text-muted">{{ product.slug }}</div>
            </td>
            <td class="py-2"><ProductStatusBadge :status="product.status" /></td>
            <td class="py-2">{{ product.activeVariantCount }} of {{ product.variantCount }} active</td>
            <td class="py-2">{{ product.category.name }}</td>
            <td class="py-2 text-muted">{{ new Date(product.updatedAt).toLocaleString('en-US') }}</td>
          </tr>
          <tr v-if="fetchStatus === 'success' && (result?.data.length ?? 0) === 0">
            <td colspan="5" class="py-6 text-center text-muted">No products found.</td>
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
