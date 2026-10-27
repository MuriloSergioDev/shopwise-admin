import type { NavigationMenuItem } from '@nuxt/ui'

/** The sidebar. */
export const navigationItems: NavigationMenuItem[] = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'Products', icon: 'i-lucide-shirt', to: '/products' },
  { label: 'Coupons', icon: 'i-lucide-ticket-percent', to: '/coupons' },
  { label: 'Orders', icon: 'i-lucide-receipt', to: '/orders' },
  { label: 'Inventory', icon: 'i-lucide-warehouse', to: '/inventory' },
]
