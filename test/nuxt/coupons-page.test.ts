import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import CouponsPage from '~/pages/coupons.vue'
import { signInAsAdmin } from './helpers'

const coupon = (overrides: Record<string, unknown> = {}) => ({
  code: 'SAVE5',
  description: '$5 off orders of $25 or more',
  type: 'fixed',
  value: 500,
  minSubtotal: 2500,
  startsAt: null,
  endsAt: null,
  active: true,
  createdAt: '2026-10-26T00:00:00Z',
  ...overrides,
})

describe('coupons page', () => {
  beforeEach(() => {
    clearNuxtData()
    signInAsAdmin()
  })

  it('lists coupons with their discount, minimum and status', async () => {
    registerEndpoint('/api/pricing/coupons', () => ({
      data: [coupon(), coupon({ code: 'OLD10', type: 'percent', value: 10, minSubtotal: 0, active: false })],
    }))

    const page = await mountSuspended(CouponsPage, { route: '/coupons' })
    const save5 = page.find('[data-code="SAVE5"]')
    const old = page.find('[data-code="OLD10"]')

    expect(save5.text()).toContain('$5.00 off')
    expect(save5.text()).toContain('$25.00')
    expect(save5.text()).toContain('Active')
    expect(old.text()).toContain('10% off')
    expect(old.text()).toContain('Inactive')
    expect(old.find('button[aria-label="Deactivate OLD10"]').exists()).toBe(false)
  })

  it('creates a coupon from the form, in minor units', async () => {
    let created: unknown
    registerEndpoint('/api/pricing/coupons', {
      method: 'GET',
      handler: () => ({ data: created ? [coupon(), coupon({ code: 'SPRING' })] : [coupon()] }),
    })
    registerEndpoint('/api/pricing/coupons', {
      method: 'POST',
      handler: async (event) => {
        created = await readBody(event)

        return { data: coupon({ code: 'SPRING' }) }
      },
    })

    const page = await mountSuspended(CouponsPage, { route: '/coupons' })
    await page.find('input[placeholder="SPRING20"]').setValue('spring')
    await page.find('input[placeholder="20"]').setValue('15')
    await page.find('input[placeholder="25.00"]').setValue('30')
    await page.find('form').trigger('submit')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await flushPromises()

    expect(created).toEqual({
      code: 'SPRING',
      type: 'percent',
      value: 15,
      minSubtotal: 3000,
      startsAt: null,
      endsAt: null,
    })
    expect(page.find('[data-code="SPRING"]').exists()).toBe(true)
  })

  it('shows field errors without calling the BFF', async () => {
    let posted = false
    registerEndpoint('/api/pricing/coupons', { method: 'GET', handler: () => ({ data: [] }) })
    registerEndpoint('/api/pricing/coupons', {
      method: 'POST',
      handler: () => {
        posted = true

        return { data: coupon() }
      },
    })

    const page = await mountSuspended(CouponsPage, { route: '/coupons' })
    await page.find('input[placeholder="SPRING20"]').setValue('NO SPACES')
    await page.find('input[placeholder="20"]').setValue('150')
    await page.find('form').trigger('submit')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(page.text()).toContain('Uppercase letters, digits, dashes and underscores')
    expect(page.text()).toContain('A percent coupon is 1 to 100')
    expect(posted).toBe(false)
  })

  it('deactivates a coupon', async () => {
    let active = true
    registerEndpoint('/api/pricing/coupons', { method: 'GET', handler: () => ({ data: [coupon({ active })] }) })
    registerEndpoint('/api/pricing/coupons/SAVE5', {
      method: 'DELETE',
      handler: () => {
        active = false

        return null
      },
    })

    const page = await mountSuspended(CouponsPage, { route: '/coupons' })
    await page.find('button[aria-label="Deactivate SAVE5"]').trigger('click')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await flushPromises()

    expect(page.find('[data-code="SAVE5"]').text()).toContain('Inactive')
  })
})
