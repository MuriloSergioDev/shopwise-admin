<script setup lang="ts">
import type { Variant } from '#shared/types/contracts'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data: product, error } = await useProduct(slug)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'No published product with that slug.', fatal: true })
}

useSeoMeta({ title: () => `${product.value?.name ?? 'Product'} · Shopwise admin` })

// useFetch data is a shallow ref: replace the product rather than mutating it.
function replaceVariant(updated: Variant) {
  if (product.value) {
    product.value = {
      ...product.value,
      variants: product.value.variants.map((variant) => (variant.id === updated.id ? updated : variant)),
    }
  }
}
</script>

<template>
  <UDashboardPanel id="product">
    <template #header>
      <PageNavbar :title="product?.name ?? 'Product'">
        <template #right>
          <UButton
            v-if="product"
            :to="`${useRuntimeConfig().public.storefrontUrl}/products/${product.slug}`"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-external-link"
            label="View in store"
          />
        </template>
      </PageNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="errorMessageOf(error, 'Could not load the product.')"
      />

      <template v-if="product">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <UBadge :label="product.status" :color="product.status === 'published' ? 'success' : 'neutral'" />
          <span class="text-muted">{{ product.category.name }}</span>
          <span class="font-mono text-muted">{{ product.slug }}</span>
        </div>
        <p v-if="product.description" class="max-w-3xl text-sm">{{ product.description }}</p>

        <UPageCard title="Variants" variant="subtle">
          <VariantTable :variants="product.variants" @updated="replaceVariant" />
          <p class="text-xs text-muted">
            Catalog's public read lists active variants only, so a variant you deactivate disappears after a reload.
          </p>
        </UPageCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
