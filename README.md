# shopwise-admin

The Shopwise back office: Nuxt app plus the Nitro BFF that is its only way into the services. Admins (identity
`admin` role) manage catalog products (create drafts, publish, edit variants), SKU prices, coupons, orders (mark
shipped) and stock counts. Conventions: `AGENTS.md`.

Run it from `shopwise-platform`: `tilt up -- --only=identity,catalog,pricing,inventory,orders,admin`, seed the services
once (see the platform README), then open http://localhost:3001 and sign in with the seeded `admin@shopwise.test`.

Checks: `pnpm check`.
