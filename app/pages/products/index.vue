<script setup lang="ts">
useSeoMeta({ title: 'Products · Shopwise admin' })

const route = useRoute()
const router = useRouter()

// All list state lives in the URL query, so a reload or a shared link shows the same page.
const query = computed(() => ({
  ...(typeof route.query.q === 'string' && route.query.q !== '' ? { q: route.query.q } : {}),
  page: Number(route.query.page) || 1,
  perPage: 20,
}))
const { data: result, status, error } = await useProductSearch(query)

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
function submitSearch() {
  router.push({ query: search.value.trim() === '' ? {} : { q: search.value.trim() } })
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
      <form class="flex gap-2" @submit.prevent="submitSearch">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search products" class="max-w-sm flex-1" />
        <UButton type="submit" color="neutral" variant="outline" label="Search" />
      </form>

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        title="Only published products are listed."
        description="Catalog has no admin listing yet. A draft is shown right after you create it; publish it there."
      />

      <UAlert v-if="error" color="error" variant="subtle" :title="errorMessageOf(error, 'Could not load products.')" />

      <table v-else class="w-full text-sm" data-test="products">
        <thead class="text-left text-muted">
          <tr>
            <th class="py-2 font-medium">Name</th>
            <th class="py-2 font-medium">Category</th>
            <th class="py-2 font-medium">Slug</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="product in result?.data ?? []" :key="product.id">
            <td class="py-2">
              <ULink :to="`/products/${product.slug}`" class="font-medium text-highlighted">{{ product.name }}</ULink>
            </td>
            <td class="py-2">{{ product.category.name }}</td>
            <td class="py-2 font-mono text-muted">{{ product.slug }}</td>
          </tr>
          <tr v-if="status === 'success' && (result?.data.length ?? 0) === 0">
            <td colspan="3" class="py-6 text-center text-muted">No products found.</td>
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
