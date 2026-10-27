// View-model types shared by the app and the BFF, taken from the service contracts.
import type { CatalogApi, IdentityApi, InventoryApi, OrdersApi, PricingApi } from '@shopwise/contracts'

type CatalogSchemas = CatalogApi.components['schemas']

export type Category = CatalogSchemas['Category']
export type ProductSummary = CatalogSchemas['ProductSummary']
export type Product = CatalogSchemas['Product']
export type Variant = CatalogSchemas['Variant']
export type AdminProductSummary = CatalogSchemas['AdminProductSummary']
export type AdminProductPage =
  CatalogApi.operations['listAdminProducts']['responses'][200]['content']['application/json']
export type CreateProductInput = CatalogApi.operations['createProduct']['requestBody']['content']['application/json']
export type UpdateVariantInput = CatalogApi.operations['updateVariant']['requestBody']['content']['application/json']

export type TokenPair = IdentityApi.components['schemas']['TokenPair']
export type Customer = IdentityApi.components['schemas']['Customer']

export type Price = PricingApi.components['schemas']['Price']
export type Coupon = PricingApi.components['schemas']['Coupon']
export type CouponInput = PricingApi.components['schemas']['CouponInput']

export type OrderStatus = OrdersApi.components['schemas']['OrderStatus']
export type OrderSummary = OrdersApi.components['schemas']['OrderSummary']
export type Order = OrdersApi.components['schemas']['Order']
export type OrderPage = OrdersApi.components['schemas']['OrderPage']

export type StockLevel = InventoryApi.components['schemas']['StockLevel']
export type StockLevelPage = InventoryApi.operations['listStockLevels']['responses'][200]['content']['application/json']
export type StockLevelDetail =
  InventoryApi.operations['getStockLevel']['responses'][200]['content']['application/json']['data']
