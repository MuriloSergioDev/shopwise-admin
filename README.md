# shopwise-admin

The Shopwise back office: Nuxt app plus the Nitro BFF that is its only way into the services. Admins (identity
`admin` role) manage catalog products (create drafts, publish, edit variants), SKU prices and coupons. Orders and
Inventory are placeholders until their admin APIs exist. Conventions: `AGENTS.md`.

Run it alone with `pnpm dev` (http://localhost:3001) while identity, catalog and pricing run in Tilt, and sign in
with the seeded `admin@shopwise.test`.

Checks: `pnpm check`.
