import type { NavigationMenuItem } from '@nuxt/ui'

/** The sidebar. Orders and Inventory wait for their admin contracts (P3) and stay disabled until then. */
export const navigationItems: NavigationMenuItem[] = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'Products', icon: 'i-lucide-shirt', to: '/products' },
  { label: 'Coupons', icon: 'i-lucide-ticket-percent', to: '/coupons' },
  { label: 'Orders', icon: 'i-lucide-receipt', disabled: true, badge: 'Soon' },
  { label: 'Inventory', icon: 'i-lucide-warehouse', disabled: true, badge: 'Soon' },
]
