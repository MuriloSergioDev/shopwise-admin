import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import ProductsPage from '~/pages/products/index.vue'
import ProductPage from '~/pages/products/[id].vue'
import NewProductPage from '~/pages/products/new.vue'
import { product, signInAsAdmin, variant } from './helpers'

const settle = async () => {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 50))
  await flushPromises()
}

beforeEach(() => {
  clearNuxtData()
  signInAsAdmin()
})

describe('products page', () => {
  it('lists drafts and published products with their variant counts, linking by id', async () => {
    const summary = {
      id: '01p',
      slug: 'merino-crew-tee',
      name: 'Merino Crew Tee',
      category: product().category,
      image: null,
    }
    registerEndpoint('/api/catalog/products', () => ({
      data: [
        {
          ...summary,
          status: 'draft',
          publishedAt: null,
          variantCount: 2,
          activeVariantCount: 1,
          updatedAt: '2026-10-27T00:00:00Z',
        },
        {
          ...summary,
          id: '01q',
          slug: 'stoneware-mug',
          name: 'Stoneware Mug',
          status: 'published',
          publishedAt: '2026-10-26T00:00:00Z',
          variantCount: 1,
          activeVariantCount: 1,
          updatedAt: '2026-10-26T00:00:00Z',
        },
      ],
      meta: { page: 1, perPage: 25, total: 2, lastPage: 1 },
    }))

    const page = await mountSuspended(ProductsPage, { route: '/products' })
    const draft = page.find('[data-product="merino-crew-tee"]')

    expect(draft.text()).toContain('Draft')
    expect(draft.text()).toContain('1 of 2 active')
    expect(page.find('[data-product="stoneware-mug"]').text()).toContain('Published')
    expect(page.find('a[href="/products/01p"]').exists()).toBe(true)
  })
})

describe('product page', () => {
  it('shows variants with their current price and sets a new one in minor units', async () => {
    let body: unknown
    registerEndpoint('/api/catalog/products/01product', () => ({
      data: product([variant(), variant({ id: '01variant-l', sku: 'TEE-BLK-L', name: 'Black / L' })]),
    }))
    registerEndpoint('/api/pricing/prices', () => ({ data: [{ sku: 'TEE-BLK-M', amount: 4500, currency: 'USD' }] }))
    registerEndpoint('/api/pricing/prices/TEE-BLK-L', {
      method: 'PUT',
      handler: async (event) => {
        body = await readBody(event)

        return { data: { sku: 'TEE-BLK-L', amount: 4250, currency: 'USD' } }
      },
    })

    const page = await mountSuspended(ProductPage, { route: '/products/01product' })
    await settle()

    const medium = page.find('input[aria-label="Price of TEE-BLK-M"]').element as HTMLInputElement
    const large = page.find('input[aria-label="Price of TEE-BLK-L"]')
    expect(medium.value).toBe('45.00')
    expect((large.element as HTMLInputElement).value).toBe('')
    expect(page.find('[data-sku="TEE-BLK-M"]').text()).toContain('color: Black, size: M')

    await large.setValue('42.50')
    await page.find('[data-sku="TEE-BLK-L"] [data-test="price-form"]').trigger('submit')
    await settle()

    expect(body).toEqual({ amount: 4250, currency: 'USD' })
  })

  it('deactivates a variant through the BFF', async () => {
    let body: unknown
    registerEndpoint('/api/catalog/products/01product', () => ({ data: product() }))
    registerEndpoint('/api/pricing/prices', () => ({ data: [] }))
    registerEndpoint('/api/catalog/variants/01variant-m', {
      method: 'PATCH',
      handler: async (event) => {
        body = await readBody(event)

        return { data: variant({ active: false }) }
      },
    })

    const page = await mountSuspended(ProductPage, { route: '/products/01product' })
    await page.find('button[aria-label="TEE-BLK-M active"]').trigger('click')
    await settle()

    expect(body).toEqual({ active: false })
    expect(page.find('button[aria-label="TEE-BLK-M active"]').attributes('aria-checked')).toBe('false')
  })

  it('lists inactive variants too', async () => {
    registerEndpoint('/api/catalog/products/01product', () => ({
      data: product([variant(), variant({ id: '01variant-s', sku: 'TEE-BLK-S', active: false })]),
    }))
    registerEndpoint('/api/pricing/prices', () => ({ data: [] }))

    const page = await mountSuspended(ProductPage, { route: '/products/01product' })

    expect(page.find('button[aria-label="TEE-BLK-S active"]').attributes('aria-checked')).toBe('false')
  })

  it('publishes a draft from its page', async () => {
    let published = false
    registerEndpoint('/api/catalog/products/01product', () => ({ data: product([variant()], 'draft') }))
    registerEndpoint('/api/pricing/prices', () => ({ data: [] }))
    registerEndpoint('/api/catalog/products/01product/publish', {
      method: 'POST',
      handler: () => {
        published = true

        return { data: product() }
      },
    })

    const page = await mountSuspended(ProductPage, { route: '/products/01product' })
    expect(page.text()).toContain('Draft')
    await page
      .findAll('button')
      .find((button) => button.text() === 'Publish')!
      .trigger('click')
    await settle()

    expect(published).toBe(true)
    expect(page.text()).toContain('Published')
    expect(page.text()).toContain('View in store')
  })
})

describe('new product page', () => {
  it('creates a draft and opens its page', async () => {
    let created: unknown
    registerEndpoint('/api/catalog/categories', () => ({
      data: [{ id: '01apparel', slug: 'apparel', name: 'Apparel', parentId: null }],
    }))
    registerEndpoint('/api/pricing/prices', () => ({ data: [] }))
    registerEndpoint('/api/catalog/products', {
      method: 'POST',
      handler: async (event) => {
        created = await readBody(event)

        return { data: product([variant()], 'draft') }
      },
    })

    const page = await mountSuspended(NewProductPage, { route: '/products/new' })
    // USelect is a reka-ui listbox; set the form state the way choosing an item would.
    const form = page.findComponent({ name: 'UForm' })
    ;(form.props('state') as { categoryId: string }).categoryId = '01apparel'
    await page.find('input[aria-label="Variant 1 SKU"]').setValue('TEE-BLK-M')
    await page.find('input[aria-label="Variant 1 name"]').setValue('Black / M')
    await page.find('input[aria-label="Variant 1 options"]').setValue('Color: Black, size: M')
    await page.findAll('input')[0]!.setValue('Merino Crew Tee')
    await page.find('form').trigger('submit')
    await settle()

    expect(created).toEqual({
      name: 'Merino Crew Tee',
      categoryId: '01apparel',
      variants: [{ sku: 'TEE-BLK-M', name: 'Black / M', options: { color: 'Black', size: 'M' } }],
    })
    expect(useRouter().currentRoute.value.path).toBe('/products/01product')
  })

  it('flags options it cannot read without calling the BFF', async () => {
    let posted = false
    registerEndpoint('/api/catalog/categories', () => ({ data: [] }))
    registerEndpoint('/api/catalog/products', {
      method: 'POST',
      handler: () => {
        posted = true

        return { data: product() }
      },
    })

    const page = await mountSuspended(NewProductPage, { route: '/products/new' })
    await page.find('input[aria-label="Variant 1 options"]').setValue('Black')
    await page.find('form').trigger('submit')
    await settle()

    expect(page.text()).toContain('Write options as name: value, name: value')
    expect(page.text()).toContain('Enter a name')
    expect(posted).toBe(false)
  })
})
