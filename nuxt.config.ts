// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', 'nuxt-auth-utils', '@nuxt/test-utils/module'],
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },
  // The storefront owns :3000.
  devServer: { port: 3001 },

  // Service base URLs are server-only: the browser only ever talks to this BFF.
  // Override with NUXT_IDENTITY_URL / NUXT_CATALOG_URL / NUXT_PRICING_URL / NUXT_INVENTORY_URL / NUXT_ORDERS_URL.
  runtimeConfig: {
    identityUrl: 'http://localhost:8101',
    catalogUrl: 'http://localhost:8102',
    pricingUrl: 'http://localhost:8104',
    inventoryUrl: 'http://localhost:8103',
    ordersUrl: 'http://localhost:8108',
    // Cookies are per host, not per port: without its own name this session would overwrite the storefront's
    // (both run on localhost).
    session: { name: 'shopwise-admin-session' },
    public: { storefrontUrl: 'http://localhost:3000' },
  },

  // No routeRules caching: every response is for a signed-in admin, and cached handlers drop the session cookie.
})
