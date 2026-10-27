import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import OrdersPage from '~/pages/orders/index.vue'
import OrderPage from '~/pages/orders/[id].vue'
import InventoryPage from '~/pages/inventory/index.vue'
import StockLevelPage from '~/pages/inventory/[sku].vue'
import { signInAsAdmin } from './helpers'

const settle = async () => {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 50))
  await flushPromises()
}

const summary = {
  id: '01order',
  number: 'SW-000001',
  status: 'placed' as const,
  customerId: '01customer',
  email: 'ada@shopwise.test',
  itemCount: 2,
  currency: 'USD',
  total: 8100,
  placedAt: '2026-10-26T00:00:00Z',
}

const order = (shipment: { carrier: string; trackingNumber: string; shippedAt: string } | null = null) => ({
  ...summary,
  status: shipment ? 'shipped' : 'placed',
  checkoutId: '01checkout',
  paymentId: '01payment',
  lines: [
    {
      sku: 'TEE-BLK-M',
      productName: 'Merino Crew Tee',
      variantName: 'Black / M',
      quantity: 2,
      unitAmount: 4500,
      lineAmount: 9000,
    },
  ],
  subtotal: 9000,
  discount: 900,
  couponCode: 'WELCOME10',
  shippingAddress: {
    name: 'Ada',
    line1: '1 Main St',
    line2: null,
    city: 'Springfield',
    region: 'IL',
    postalCode: '12345',
    country: 'US',
  },
  shipment,
})

const level = (overrides: Record<string, unknown> = {}) => ({
  sku: 'TEE-BLK-M',
  onHand: 50,
  reserved: 2,
  available: 48,
  updatedAt: '2026-10-26T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  clearNuxtData()
  signInAsAdmin()
})

describe('orders page', () => {
  it('lists orders with their total and status, linking to the order', async () => {
    registerEndpoint('/api/orders', () => ({
      data: [summary, { ...summary, id: '01other', number: 'SW-000002', status: 'shipped' }],
      meta: { page: 1, perPage: 25, total: 2, lastPage: 1 },
    }))

    const page = await mountSuspended(OrdersPage, { route: '/orders' })
    const first = page.find('[data-order="SW-000001"]')

    expect(first.text()).toContain('ada@shopwise.test')
    expect(first.text()).toContain('$81.00')
    expect(first.text()).toContain('To ship')
    expect(page.find('[data-order="SW-000002"]').text()).toContain('Shipped')
    expect(page.find('a[href="/orders/01order"]').exists()).toBe(true)
  })
})

describe('order page', () => {
  it('shows lines, totals with the coupon and the address', async () => {
    registerEndpoint('/api/orders/01order', () => ({ data: order() }))

    const page = await mountSuspended(OrderPage, { route: '/orders/01order' })

    expect(page.find('[data-test="lines"]').text()).toContain('Merino Crew Tee · Black / M')
    expect(page.find('[data-test="lines"]').text()).toContain('Discount (WELCOME10)')
    expect(page.find('[data-test="lines"]').text()).toContain('−$9.00')
    expect(page.find('[data-test="address"]').text()).toContain('Springfield, IL 12345')
  })

  it('marks the order shipped and shows the shipment', async () => {
    let body: unknown
    registerEndpoint('/api/orders/01order', { method: 'GET', handler: () => ({ data: order() }) })
    registerEndpoint('/api/orders/01order/shipment', {
      method: 'PUT',
      handler: async (event) => {
        body = await readBody(event)

        return { data: order({ carrier: 'UPS', trackingNumber: '1Z999', shippedAt: '2026-10-27T00:00:00Z' }) }
      },
    })

    const page = await mountSuspended(OrderPage, { route: '/orders/01order' })
    await page.find('input[placeholder="UPS"]').setValue(' UPS ')
    await page.findAll('[data-test="shipment"] input')[1]!.setValue('1Z999')
    await page.find('[data-test="shipment"] form').trigger('submit')
    await settle()

    expect(body).toEqual({ carrier: 'UPS', trackingNumber: '1Z999' })
    expect(page.find('[data-test="shipment"]').text()).toContain('UPS · 1Z999')
  })

  it('needs a carrier and a tracking number', async () => {
    let called = false
    registerEndpoint('/api/orders/01order', { method: 'GET', handler: () => ({ data: order() }) })
    registerEndpoint('/api/orders/01order/shipment', {
      method: 'PUT',
      handler: () => {
        called = true

        return { data: order() }
      },
    })

    const page = await mountSuspended(OrderPage, { route: '/orders/01order' })
    await page.find('[data-test="shipment"] form').trigger('submit')
    await settle()

    expect(page.text()).toContain('Enter a carrier')
    expect(page.text()).toContain('Enter a tracking number')
    expect(called).toBe(false)
  })
})

describe('inventory page', () => {
  it('lists stock and records a new count in place', async () => {
    let body: unknown
    registerEndpoint('/api/inventory/stock', {
      method: 'GET',
      handler: () => ({ data: [level()], meta: { page: 1, perPage: 50, total: 1, lastPage: 1 } }),
    })
    registerEndpoint('/api/inventory/stock/TEE-BLK-M', {
      method: 'PUT',
      handler: async (event) => {
        body = await readBody(event)

        return { data: level({ onHand: 4, available: 2 }) }
      },
    })

    const page = await mountSuspended(InventoryPage, { route: '/inventory' })
    const row = () => page.find('[data-sku="TEE-BLK-M"]')
    expect(row().text()).toContain('48')

    await row().find('input').setValue('4')
    await row().find('[data-test="stock-form"]').trigger('submit')
    await settle()

    expect(body).toEqual({ onHand: 4 })
    expect(row().findAll('td')[3]!.text()).toBe('2')
  })

  it('does not send a count that is not a whole number', async () => {
    let called = false
    registerEndpoint('/api/inventory/stock', {
      method: 'GET',
      handler: () => ({ data: [level()], meta: { page: 1, perPage: 50, total: 1, lastPage: 1 } }),
    })
    registerEndpoint('/api/inventory/stock/TEE-BLK-M', {
      method: 'PUT',
      handler: () => {
        called = true

        return { data: level() }
      },
    })

    const page = await mountSuspended(InventoryPage, { route: '/inventory' })
    await page.find('[data-sku="TEE-BLK-M"] input').setValue('2.5')
    await page.find('[data-test="stock-form"]').trigger('submit')
    await settle()

    expect(called).toBe(false)
  })
})

describe('stock level page', () => {
  it('shows the levels and open reservations', async () => {
    registerEndpoint('/api/inventory/stock/TEE-BLK-M', () => ({
      data: {
        ...level(),
        reservations: [
          { id: '01res', checkoutId: '01checkout', quantity: 2, status: 'held', expiresAt: '2026-10-27T00:15:00Z' },
        ],
      },
    }))

    const page = await mountSuspended(StockLevelPage, { route: '/inventory/TEE-BLK-M' })

    expect(page.find('[data-test="levels"]').text()).toContain('48')
    expect(page.find('[data-test="reservations"]').text()).toContain('01checkout')
  })
})
