import type { FormError } from '@nuxt/ui'
import type { CouponInput } from '#shared/types/contracts'
import { formatMoney, parseMoney } from '#shared/utils/money'
import { couponInputSchema } from '#shared/utils/schemas'

/**
 * Reads variant options typed as `color: Black, size: M`. Names are lowercased (catalog's rule). Empty input is
 * `{}`; a part without a name and a value makes the whole input invalid (null).
 */
export function parseOptions(input: string): Record<string, string> | null {
  const options: Record<string, string> = {}
  for (const part of input.split(',')) {
    if (part.trim() === '') {
      continue
    }
    const [name, ...rest] = part.split(':')
    const key = name?.trim().toLowerCase() ?? ''
    const value = rest.join(':').trim()
    if (key === '' || value === '') {
      return null
    }
    options[key] = value
  }

  return options
}

export const formatOptions = (options: Record<string, string>): string =>
  Object.entries(options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(', ')

/** The coupon form as typed: amounts in major units, dates from `datetime-local` inputs (local time). */
export interface CouponForm {
  code: string
  description: string
  type: 'percent' | 'fixed'
  value: string
  minSubtotal: string
  startsAt: string
  endsAt: string
}

export const emptyCouponForm = (): CouponForm => ({
  code: '',
  description: '',
  type: 'percent',
  value: '',
  minSubtotal: '',
  startsAt: '',
  endsAt: '',
})

const toIso = (local: string): string | null => (local === '' ? null : new Date(local).toISOString())

/** Turns the typed form into pricing's CouponInput, or the errors to show next to its fields. */
export function couponFromForm(form: CouponForm): { input: CouponInput | null; errors: FormError[] } {
  const errors: FormError[] = []
  const value =
    form.type === 'percent'
      ? /^\d+$/.test(form.value.trim())
        ? Number(form.value)
        : null
      : parseMoney(form.value, 'USD')
  if (value === null) {
    errors.push({ name: 'value', message: form.type === 'percent' ? 'Enter a whole percent' : 'Enter an amount' })
  }
  const minSubtotal = form.minSubtotal.trim() === '' ? undefined : parseMoney(form.minSubtotal, 'USD')
  if (minSubtotal === null) {
    errors.push({ name: 'minSubtotal', message: 'Enter an amount' })
  }
  const candidate = {
    code: form.code.trim().toUpperCase(),
    description: form.description.trim() === '' ? undefined : form.description.trim(),
    type: form.type,
    value: value ?? 1,
    minSubtotal: minSubtotal ?? undefined,
    startsAt: toIso(form.startsAt),
    endsAt: toIso(form.endsAt),
  }
  if (candidate.startsAt && candidate.endsAt && candidate.endsAt <= candidate.startsAt) {
    errors.push({ name: 'endsAt', message: 'Ends after it starts' })
  }

  const parsed = couponInputSchema.safeParse(candidate)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const name = String(issue.path[0] ?? '')
      if (!errors.some((error) => error.name === name)) {
        errors.push({ name, message: issue.message })
      }
    }
  }

  return { input: errors.length === 0 && parsed.success ? parsed.data : null, errors }
}

/** How a coupon's discount reads in the list. */
export const describeDiscount = (coupon: Pick<CouponInput, 'type' | 'value'>): string =>
  coupon.type === 'percent' ? `${coupon.value}% off` : `${formatMoney(coupon.value, 'USD')} off`
