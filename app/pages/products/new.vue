<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { CreateProductInput, Product, Variant } from '#shared/types/contracts'

useSeoMeta({ title: 'New product · Shopwise admin' })

const toast = useToast()
const { data: categories } = await useCategories()
const categoryItems = computed(() => categories.value.map((category) => ({ label: category.name, value: category.id })))

interface VariantRow {
  sku: string
  name: string
  options: string
}

const form = reactive({
  name: '',
  slug: '',
  description: '',
  categoryId: '',
  variants: [{ sku: '', name: '', options: '' }] as VariantRow[],
})
const errorMessage = ref<string>()
const submitting = ref(false)
/** The draft just created; catalog cannot list drafts yet, so this is the one place to publish it. */
const draft = ref<Product>()
const publishing = ref(false)

/** The form as catalog's create input, or the errors to show (variant fields are named `variants.<n>.<field>`). */
function toInput(): { input: CreateProductInput | null; errors: FormError[] } {
  const errors: FormError[] = []
  const variants = form.variants.map((row, index) => {
    const options = parseOptions(row.options)
    if (options === null) {
      errors.push({ name: `variants.${index}.options`, message: 'Write options as name: value, name: value' })
    }

    return {
      sku: row.sku.trim(),
      name: row.name.trim(),
      ...(options && Object.keys(options).length ? { options } : {}),
    }
  })
  const parsed = productInputSchema.safeParse({
    name: form.name,
    slug: form.slug.trim() || undefined,
    description: form.description.trim() || undefined,
    categoryId: form.categoryId,
    variants,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ name: issue.path.join('.'), message: issue.message })
    }
  }

  return { input: errors.length === 0 && parsed.success ? parsed.data : null, errors }
}

const validate = () => toInput().errors

async function onSubmit() {
  const { input } = toInput()
  if (!input) {
    return
  }
  errorMessage.value = undefined
  submitting.value = true
  try {
    draft.value = await createProduct(input)
    toast.add({ title: `Draft ${draft.value.name} created`, icon: 'i-lucide-check' })
  } catch (error) {
    errorMessage.value = errorMessageOf(error, 'Could not create the product.')
  } finally {
    submitting.value = false
  }
}

async function publish() {
  if (!draft.value) {
    return
  }
  publishing.value = true
  try {
    const published = await publishProduct(draft.value.id)
    toast.add({ title: `${published.name} is live`, icon: 'i-lucide-rocket' })
    await navigateTo(`/products/${published.slug}`)
  } catch (error) {
    toast.add({ title: errorMessageOf(error, 'Could not publish.'), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    publishing.value = false
  }
}

function replaceVariant(updated: Variant) {
  if (draft.value) {
    draft.value.variants = draft.value.variants.map((variant) => (variant.id === updated.id ? updated : variant))
  }
}

function startOver() {
  draft.value = undefined
  Object.assign(form, {
    name: '',
    slug: '',
    description: '',
    categoryId: '',
    variants: [{ sku: '', name: '', options: '' }],
  })
}
</script>

<template>
  <UDashboardPanel id="new-product">
    <template #header>
      <PageNavbar title="New product" />
    </template>

    <template #body>
      <UPageCard
        v-if="draft"
        :title="draft.name"
        description="Draft created. Set prices, then publish it."
        variant="subtle"
      >
        <VariantTable :variants="draft.variants" @updated="replaceVariant" />
        <div class="flex gap-2">
          <UButton icon="i-lucide-rocket" label="Publish" :loading="publishing" @click="publish" />
          <UButton color="neutral" variant="ghost" label="Create another" @click="startOver" />
        </div>
      </UPageCard>

      <UForm v-else :state="form" :validate="validate" class="max-w-3xl space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="form.name" class="w-full" />
        </UFormField>
        <UFormField label="Slug" name="slug" hint="Optional: defaults to the slugged name">
          <UInput v-model="form.slug" class="w-full" />
        </UFormField>
        <UFormField label="Category" name="categoryId" required>
          <USelect v-model="form.categoryId" :items="categoryItems" placeholder="Pick a category" class="w-full" />
        </UFormField>
        <UFormField label="Description" name="description">
          <UTextarea v-model="form.description" :rows="4" class="w-full" />
        </UFormField>

        <fieldset class="space-y-2">
          <legend class="text-sm font-medium">Variants</legend>
          <div
            v-for="(variant, index) in form.variants"
            :key="index"
            class="grid gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto]"
          >
            <UFormField :name="`variants.${index}.sku`">
              <UInput v-model="variant.sku" placeholder="SKU" :aria-label="`Variant ${index + 1} SKU`" class="w-full" />
            </UFormField>
            <UFormField :name="`variants.${index}.name`">
              <UInput
                v-model="variant.name"
                placeholder="Name"
                :aria-label="`Variant ${index + 1} name`"
                class="w-full"
              />
            </UFormField>
            <UFormField :name="`variants.${index}.options`">
              <UInput
                v-model="variant.options"
                placeholder="color: Black, size: M"
                :aria-label="`Variant ${index + 1} options`"
                class="w-full"
              />
            </UFormField>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              :aria-label="`Remove variant ${index + 1}`"
              :disabled="form.variants.length === 1"
              @click="form.variants.splice(index, 1)"
            />
          </div>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-plus"
            label="Add variant"
            size="sm"
            @click="form.variants.push({ sku: '', name: '', options: '' })"
          />
        </fieldset>

        <UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="errorMessage" />
        <UButton type="submit" label="Create draft" :loading="submitting" />
      </UForm>
    </template>
  </UDashboardPanel>
</template>
