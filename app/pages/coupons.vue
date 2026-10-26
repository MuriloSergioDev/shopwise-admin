<script setup lang="ts">
import type { Coupon } from '#shared/types/contracts'

useSeoMeta({ title: 'Coupons · Shopwise admin' })

const toast = useToast()
const { data: coupons, error, refresh } = await useCoupons()

const form = reactive(emptyCouponForm())
const typeItems = [
  { label: 'Percent off', value: 'percent' },
  { label: 'Amount off', value: 'fixed' },
]
const errorMessage = ref<string>()
const submitting = ref(false)
const deactivating = ref<string>()

const validate = () => couponFromForm(form).errors

async function onSubmit() {
  const { input } = couponFromForm(form)
  if (!input) {
    return
  }
  errorMessage.value = undefined
  submitting.value = true
  try {
    const created = await createCoupon(input)
    toast.add({ title: `Coupon ${created.code} created`, icon: 'i-lucide-check' })
    Object.assign(form, emptyCouponForm())
    await refresh()
  } catch (failure) {
    errorMessage.value = errorMessageOf(failure, 'Could not create the coupon.')
  } finally {
    submitting.value = false
  }
}

async function deactivate(coupon: Coupon) {
  deactivating.value = coupon.code
  try {
    await deactivateCoupon(coupon.code)
    toast.add({ title: `Coupon ${coupon.code} deactivated`, icon: 'i-lucide-check' })
    await refresh()
  } catch (failure) {
    toast.add({
      title: errorMessageOf(failure, 'Could not deactivate it.'),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    deactivating.value = undefined
  }
}

const formatDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-US') : '—')
</script>

<template>
  <UDashboardPanel id="coupons">
    <template #header>
      <PageNavbar title="Coupons" />
    </template>

    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" :title="errorMessageOf(error, 'Could not load coupons.')" />

      <table v-else class="w-full text-sm" data-test="coupons">
        <thead class="text-left text-muted">
          <tr>
            <th class="py-2 font-medium">Code</th>
            <th class="py-2 font-medium">Discount</th>
            <th class="py-2 font-medium">Minimum</th>
            <th class="py-2 font-medium">Valid</th>
            <th class="py-2 font-medium">Status</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="coupon in coupons" :key="coupon.code" :data-code="coupon.code">
            <td class="py-2">
              <div class="font-mono font-medium text-highlighted">{{ coupon.code }}</div>
              <div v-if="coupon.description" class="text-muted">{{ coupon.description }}</div>
            </td>
            <td class="py-2">{{ describeDiscount(coupon) }}</td>
            <td class="py-2">{{ coupon.minSubtotal ? formatMoney(coupon.minSubtotal, 'USD') : '—' }}</td>
            <td class="py-2 text-muted">{{ formatDate(coupon.startsAt) }} → {{ formatDate(coupon.endsAt) }}</td>
            <td class="py-2">
              <UBadge :label="coupon.active ? 'Active' : 'Inactive'" :color="coupon.active ? 'success' : 'neutral'" />
            </td>
            <td class="py-2 text-right">
              <UButton
                v-if="coupon.active"
                color="error"
                variant="ghost"
                size="sm"
                label="Deactivate"
                :aria-label="`Deactivate ${coupon.code}`"
                :loading="deactivating === coupon.code"
                @click="deactivate(coupon)"
              />
            </td>
          </tr>
          <tr v-if="coupons.length === 0">
            <td colspan="6" class="py-6 text-center text-muted">No coupons yet.</td>
          </tr>
        </tbody>
      </table>

      <UPageCard title="New coupon" variant="subtle" class="max-w-3xl">
        <UForm :state="form" :validate="validate" class="grid gap-4 sm:grid-cols-2" @submit="onSubmit">
          <UFormField label="Code" name="code" required>
            <UInput v-model="form.code" placeholder="SPRING20" class="w-full" />
          </UFormField>
          <UFormField label="Description" name="description">
            <UInput v-model="form.description" class="w-full" />
          </UFormField>
          <UFormField label="Type" name="type">
            <USelect v-model="form.type" :items="typeItems" class="w-full" />
          </UFormField>
          <UFormField :label="form.type === 'percent' ? 'Percent' : 'Amount (USD)'" name="value" required>
            <UInput v-model="form.value" :placeholder="form.type === 'percent' ? '20' : '5.00'" class="w-full" />
          </UFormField>
          <UFormField label="Minimum subtotal (USD)" name="minSubtotal">
            <UInput v-model="form.minSubtotal" placeholder="25.00" class="w-full" />
          </UFormField>
          <div></div>
          <UFormField label="Starts" name="startsAt">
            <UInput v-model="form.startsAt" type="datetime-local" class="w-full" />
          </UFormField>
          <UFormField label="Ends" name="endsAt">
            <UInput v-model="form.endsAt" type="datetime-local" class="w-full" />
          </UFormField>
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
            class="sm:col-span-2"
          />
          <div class="sm:col-span-2">
            <UButton type="submit" label="Create coupon" :loading="submitting" />
          </div>
        </UForm>
      </UPageCard>
    </template>
  </UDashboardPanel>
</template>
