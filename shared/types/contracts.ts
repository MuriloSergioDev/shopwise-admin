// View-model types shared by the app and the BFF, taken from the service contracts.
import type { CatalogApi, IdentityApi, PricingApi } from '@shopwise/contracts'

type CatalogSchemas = CatalogApi.components['schemas']

export type Category = CatalogSchemas['Category']
export type ProductSummary = CatalogSchemas['ProductSummary']
export type Product = CatalogSchemas['Product']
export type Variant = CatalogSchemas['Variant']
export type ProductSearchResult =
  CatalogApi.operations['searchProducts']['responses'][200]['content']['application/json']
export type CreateProductInput = CatalogApi.operations['createProduct']['requestBody']['content']['application/json']
export type UpdateVariantInput = CatalogApi.operations['updateVariant']['requestBody']['content']['application/json']

export type TokenPair = IdentityApi.components['schemas']['TokenPair']
export type Customer = IdentityApi.components['schemas']['Customer']

export type Price = PricingApi.components['schemas']['Price']
export type Coupon = PricingApi.components['schemas']['Coupon']
export type CouponInput = PricingApi.components['schemas']['CouponInput']
