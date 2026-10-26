# shopwise-admin

The back office: a Nuxt app and its Nitro BFF for staff with the identity `admin` role. The browser calls `/api/*`
here, the BFF calls services. Service URLs and JWTs never reach the browser. Same stack and conventions as
`shopwise-storefront`; read its `AGENTS.md` for the parts explained there (refresh coordinator, h3 session quirks).

## Stack

Nuxt 4 (`app/`, `server/`, `shared/`), Nuxt UI 4 dashboard layout (Tailwind 4), `nuxt-auth-utils` for the session,
`zod` for validation, strict TypeScript. Contract types come from `@shopwise/contracts` (pnpm git dependency) via
`shared/types/contracts.ts`; never hand-write a service's response type. Dev server on **:3001** (storefront owns
:3000).

## Layout

- `server/api/<area>/…` — BFF routes. Validate input with zod (`readValidatedBody`, `getValidatedQuery`,
  `getValidatedRouterParams`), call services through `asAdmin` + `serviceFetch`, return contract shapes.
- `server/utils/services.ts` — `serviceFetch(event, service, path, options)`: base URL from runtime config, `Bearer`
  token, forwards `traceparent`, maps failures through `toBffError` (4xx pass through with the service's message;
  anything else is a 502 that hides service internals).
- `server/utils/admin-session.ts` — `startAdminSession` (login), `adminTokens` (refreshing), `asAdmin` (run a call
  with the admin's token, refresh + retry once on 401), `endAdminSession`.
- `server/middleware/admin-session.ts` — the server-side role gate and the page-request refresh.
- `shared/utils/schemas.ts` — zod input schemas mirroring the contracts; the BFF and the forms both use them.
- `app/composables/` — `useFetch` wrappers with stable keys plus the write actions (`createProduct`, `setPrice`, …).
- `app/pages/` — `index` (overview), `products/index`, `products/new`, `products/[slug]`, `coupons`, `login`.
  `app/middleware/auth.global.ts` sends signed-out visitors to `/login` (navigation only, not security).
- `app/utils/navigation-items.ts` — the sidebar. Orders and Inventory are disabled placeholders.

BFF routes (all admin-only except `/api/auth/*`):
`POST /api/auth/{login,logout}`, `GET /api/catalog/categories`, `GET /api/catalog/products?q=&page=&perPage=`,
`GET /api/catalog/products/{slug}`, `POST /api/catalog/products`, `POST /api/catalog/products/{id}/publish`,
`PATCH /api/catalog/variants/{id}`, `GET /api/pricing/prices?skus[]=`, `PUT /api/pricing/prices/{sku}`,
`GET|POST /api/pricing/coupons`, `DELETE /api/pricing/coupons/{code}` (pricing deactivates it).

## Rules

- **Admins only, checked on the server.** Login asks identity `/api/me` and refuses (403, no session) anyone
  without `admin`; their fresh refresh token is revoked. `server/middleware/admin-session.ts` answers 401 to every
  `/api/*` request except `/api/auth/*` and `/api/_auth/*` unless the session holds an admin with tokens, so a new
  route is protected without doing anything. Services check the role again on every admin call.
- **Refresh** works as in the storefront (single-flight per refresh token, 30 s grace, refresh on page requests),
  and each exchange also re-reads `/api/me`: an account that lost `admin` is signed out at its next refresh and the
  new refresh token is revoked. If `/api/me` fails right after a refresh, the new pair is kept (the old token is
  already spent) and the stored user stays.
- **Session cookie** is named `shopwise-admin-session`. Cookies are per host, not per port: with the default name
  the admin and the storefront on localhost would overwrite each other's session.
- **No caching.** Every response is for a signed-in admin; cached handlers would drop the session cookie.
- `useFetch` data is a shallow ref: replace objects (`data.value = { ...data.value, … }`), don't mutate them.
- Money is integer minor units. Forms take major units: `parseMoney` / `toMoneyInput` / `formatMoney`
  (`shared/utils/money.ts`). The store sells in USD only.
- **Don't fake missing APIs.** Orders and Inventory stay disabled until their admin contracts exist in
  `shopwise-contracts`; wire them through `serviceFetch` like the others.

## Known gaps (catalog contract)

Catalog has no admin read endpoints. The product list is the public search (published products only) and the
product page is the public detail by slug (active variants only). So a draft is visible only on the create page
right after creating it (publish it there), and a deactivated variant disappears from the product page after a
reload. Fix: add `GET /api/admin/products` (all statuses) and `GET /api/admin/products/{id}` (all variants) to the
catalog contract and service, then point the BFF's list/detail routes at them.

## Run

Under Tilt from `shopwise-platform` once it is wired (see README). Alone: `pnpm dev` → http://localhost:3001 (needs
identity :8101, catalog :8102, pricing :8104; override with `NUXT_IDENTITY_URL` / `NUXT_CATALOG_URL` /
`NUXT_PRICING_URL`; `NUXT_PUBLIC_STOREFRONT_URL` for the "View in store" link). Sign in with identity's seeded
`admin@shopwise.test`.

## Checks

`pnpm check` = prettier, eslint, `nuxt typecheck`, vitest. Vitest projects:

- `test/unit` — plain Node, pure helpers (`#shared` is aliased in `vitest.config.ts`).
- `test/nuxt` — Nuxt environment, pages (`mountSuspended`, `registerEndpoint`); `helpers.ts` signs the app in.
- `test/bff` — builds the app and calls the real Nitro server against in-memory fakes of identity, catalog and
  pricing (`test/bff/fake-services.ts` on `upstream.ts`). Every BFF route gets a test, including the 401 gate, the
  non-admin login, the role check on refresh and the refresh behaviour.

Install note: `pnpm-workspace.yaml` allowlists build scripts; `@shopwise/contracts` is set to `false` so pnpm doesn't
run its `prepare` (lefthook) when installing it from git.
