import type { Variant } from '#shared/types/contracts'

/** Signs the test app in as an admin, the way nuxt-auth-utils stores the fetched session. */
export function signInAsAdmin() {
  useState('nuxt-session').value = {
    user: { id: '01admin', email: 'admin@shopwise.test', name: 'Shopwise Admin', roles: ['customer', 'admin'] },
  }
}

export const variant = (overrides: Partial<Variant> = {}): Variant => ({
  id: '01variant-m',
  sku: 'TEE-BLK-M',
  name: 'Black / M',
  options: { color: 'Black', size: 'M' },
  active: true,
  ...overrides,
})

export const product = (variants: Variant[] = [variant()], status: 'draft' | 'published' = 'published') => ({
  id: '01product',
  slug: 'merino-crew-tee',
  name: 'Merino Crew Tee',
  description: 'Soft.',
  category: { id: '01apparel', slug: 'apparel', name: 'Apparel' },
  images: [],
  variants,
  status,
  publishedAt: null,
})
