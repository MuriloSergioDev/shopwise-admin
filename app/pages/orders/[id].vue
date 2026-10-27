<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: order, error } = await useOrder(id)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'No order with that id.', fatal: true })
}

useSeoMeta({ title: () => `${order.value?.number ?? 'Order'} · Shopwise admin` })

const toast = useToast()
const shipment = reactive({ carrier: '', trackingNumber: '' })
const shipping = ref(false)
const errorMessage = ref<string>()

const validate = (): FormError[] => {
  const parsed = shipmentInputSchema.safeParse(shipment)

  return parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({ name: String(issue.path[0]), message: issue.message }))
}

async function ship() {
  errorMessage.value = undefined
  shipping.value = true
  try {
    // useFetch data is a shallow ref: replace the order rather than mutating it.
    order.value = await markShipped(id.value, shipmentInputSchema.parse(shipment))
    toast.add({ title: `${order.value.number} marked shipped`, icon: 'i-lucide-truck' })
  } catch (failure) {
    errorMessage.value = errorMessageOf(failure, 'Could not mark the order shipped.')
  } finally {
    shipping.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="order">
    <template #header>
      <PageNavbar :title="order?.number ?? 'Order'">
        <template #right>
          <OrderStatusBadge v-if="order" :status="order.status" />
        </template>
      </PageNavbar>
    </template>

    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" :title="errorMessageOf(error, 'Could not load the order.')" />

      <template v-if="order">
        <div class="grid gap-4 lg:grid-cols-3">
          <UPageCard title="Customer" variant="subtle">
            <p class="text-sm">{{ order.email }}</p>
            <p class="text-sm text-muted">Placed {{ new Date(order.placedAt).toLocaleString('en-US') }}</p>
          </UPageCard>
          <UPageCard title="Ship to" variant="subtle">
            <address class="text-sm not-italic" data-test="address">
              {{ order.shippingAddress.name }}<br />
              {{ order.shippingAddress.line1 }}<br />
              <template v-if="order.shippingAddress.line2">{{ order.shippingAddress.line2 }}<br /></template>
              {{ order.shippingAddress.city
              }}<template v-if="order.shippingAddress.region">, {{ order.shippingAddress.region }}</template>
              {{ order.shippingAddress.postalCode }}<br />
              {{ order.shippingAddress.country }}
            </address>
          </UPageCard>
          <UPageCard title="Shipment" variant="subtle" data-test="shipment">
            <div v-if="order.shipment" class="text-sm">
              <p>
                {{ order.shipment.carrier }} · <span class="font-mono">{{ order.shipment.trackingNumber }}</span>
              </p>
              <p class="text-muted">Shipped {{ new Date(order.shipment.shippedAt).toLocaleString('en-US') }}</p>
            </div>
            <UForm v-else :state="shipment" :validate="validate" class="space-y-2" @submit="ship">
              <UFormField label="Carrier" name="carrier">
                <UInput v-model="shipment.carrier" placeholder="UPS" class="w-full" />
              </UFormField>
              <UFormField label="Tracking number" name="trackingNumber">
                <UInput v-model="shipment.trackingNumber" class="w-full" />
              </UFormField>
              <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />
              <UButton type="submit" icon="i-lucide-truck" label="Mark shipped" :loading="shipping" />
            </UForm>
          </UPageCard>
        </div>

        <UPageCard title="Items" variant="subtle">
          <table class="w-full text-sm" data-test="lines">
            <thead class="text-left text-muted">
              <tr>
                <th class="py-2 font-medium">Item</th>
                <th class="py-2 font-medium">SKU</th>
                <th class="py-2 text-right font-medium">Qty</th>
                <th class="py-2 text-right font-medium">Unit</th>
                <th class="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="line in order.lines" :key="line.sku">
                <td class="py-2">{{ line.productName ?? line.sku }} · {{ line.variantName }}</td>
                <td class="py-2 font-mono text-muted">{{ line.sku }}</td>
                <td class="py-2 text-right">{{ line.quantity }}</td>
                <td class="py-2 text-right">{{ formatMoney(line.unitAmount, order.currency) }}</td>
                <td class="py-2 text-right">{{ formatMoney(line.lineAmount, order.currency) }}</td>
              </tr>
            </tbody>
            <tfoot class="text-right">
              <tr>
                <td colspan="4" class="pt-3 text-muted">Subtotal</td>
                <td class="pt-3">{{ formatMoney(order.subtotal, order.currency) }}</td>
              </tr>
              <tr v-if="order.discount > 0">
                <td colspan="4" class="text-muted">Discount{{ order.couponCode ? ` (${order.couponCode})` : '' }}</td>
                <td>−{{ formatMoney(order.discount, order.currency) }}</td>
              </tr>
              <tr class="font-medium">
                <td colspan="4">Total</td>
                <td>{{ formatMoney(order.total, order.currency) }}</td>
              </tr>
            </tfoot>
          </table>
        </UPageCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
