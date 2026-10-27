// Input schemas for the admin writes, mirroring the service contracts. The BFF validates with them before calling
// a service, and the forms use them too, so both sides agree on the limits.
import { z } from 'zod'

const options = z.record(z.string().min(1).max(50), z.string().min(1).max(50))

export const productInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(200),
  slug: z
    .string()
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and single dashes')
    .optional(),
  description: z.string().max(5000).optional(),
  categoryId: z.string().min(1, 'Pick a category'),
  images: z
    .array(z.object({ url: z.url(), alt: z.string().max(200) }))
    .max(10)
    .optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().trim().min(1, 'Enter a SKU').max(64),
        name: z.string().trim().min(1, 'Enter a name').max(200),
        options: options.optional(),
      }),
    )
    .min(1, 'Add at least one variant')
    .max(100),
})

export const variantUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    options,
    active: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Change at least one field')

export const priceInputSchema = z.object({
  amount: z.number().int().min(0, 'A price cannot be negative'),
  currency: z.literal('USD'),
})

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .max(32)
      .regex(/^[A-Z0-9_-]+$/, 'Uppercase letters, digits, dashes and underscores'),
    description: z.string().max(200).optional(),
    type: z.enum(['percent', 'fixed']),
    value: z.number().int().min(1, 'At least 1'),
    minSubtotal: z.number().int().min(0).optional(),
    startsAt: z.iso.datetime({ offset: true }).nullable().optional(),
    endsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .refine((coupon) => coupon.type !== 'percent' || coupon.value <= 100, {
    message: 'A percent coupon is 1 to 100',
    path: ['value'],
  })

export const skuSchema = z.string().min(1).max(64)

export const shipmentInputSchema = z.object({
  carrier: z.string().trim().min(1, 'Enter a carrier').max(50),
  trackingNumber: z.string().trim().min(1, 'Enter a tracking number').max(100),
})

export const stockInputSchema = z.object({
  onHand: z.number().int('Whole units only').min(0, 'Stock cannot be negative').max(1_000_000),
})
