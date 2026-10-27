<script setup lang="ts">
import type { Variant } from '#shared/types/contracts'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: product, error } = await useProduct(id)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'No product with that id.', fatal: true })
}

useSeoMeta({ title: () => `${product.value?.name ?? 'Product'} · Shopwise admin` })

const toast = useToast()
const publishing = ref(false)

// useFetch data is a shallow ref: replace the product rather than mutating it.
function replaceVariant(updated: Variant) {
  if (product.value) {
    product.value = {
      ...product.value,
      variants: product.value.variants.map((variant) => (variant.id === updated.id ? updated : variant)),
    }
  }
}

async function publish() {
  publishing.value = true
  try {
    product.value = await publishProduct(id.value)
    toast.add({ title: `${product.value.name} is live`, icon: 'i-lucide-rocket' })
  } catch (failure) {
    // Catalog answers 409 when no variant is active.
    toast.add({ title: errorMessageOf(failure, 'Could not publish.'), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="product">
    <template #header>
      <PageNavbar :title="product?.name ?? 'Product'">
        <template #right>
          <UButton
            v-if="product?.status === 'draft'"
            icon="i-lucide-rocket"
            label="Publish"
            :loading="publishing"
            @click="publish"
          />
          <UButton
            v-else-if="product"
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
          <ProductStatusBadge :status="product.status" />
          <span class="text-muted">{{ product.category.name }}</span>
          <span class="font-mono text-muted">{{ product.slug }}</span>
        </div>
        <p v-if="product.description" class="max-w-3xl text-sm">{{ product.description }}</p>

        <UPageCard title="Variants" variant="subtle">
          <VariantTable :variants="product.variants" @updated="replaceVariant" />
          <p v-if="product.status === 'draft'" class="text-xs text-muted">
            Set prices before publishing: the storefront shows variants without a price as unavailable.
          </p>
        </UPageCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
