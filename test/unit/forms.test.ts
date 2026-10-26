import { describe, expect, it } from 'vitest'
import { couponFromForm, describeDiscount, emptyCouponForm, formatOptions, parseOptions } from '../../app/utils/forms'

describe('parseOptions', () => {
  it('reads name: value pairs with lowercase names', () => {
    expect(parseOptions('Color: Black, size: M')).toEqual({ color: 'Black', size: 'M' })
    expect(parseOptions('')).toEqual({})
    expect(parseOptions('fit: 10:1, ')).toEqual({ fit: '10:1' })
  })

  it('rejects a part without a name or a value', () => {
    expect(parseOptions('Black')).toBeNull()
    expect(parseOptions('color:')).toBeNull()
    expect(parseOptions(': Black')).toBeNull()
  })

  it('formats options back the same way', () => {
    expect(formatOptions({ color: 'Black', size: 'M' })).toBe('color: Black, size: M')
  })
})

describe('couponFromForm', () => {
  it('builds a percent coupon, uppercasing the code and dropping empty fields', () => {
    const { input, errors } = couponFromForm({ ...emptyCouponForm(), code: 'spring20', value: '20' })

    expect(errors).toEqual([])
    expect(input).toEqual({
      code: 'SPRING20',
      type: 'percent',
      value: 20,
      startsAt: null,
      endsAt: null,
    })
  })

  it('reads fixed amounts and minimums in major units and dates as ISO instants', () => {
    const { input } = couponFromForm({
      ...emptyCouponForm(),
      code: 'SAVE5',
      description: ' $5 off ',
      type: 'fixed',
      value: '5.00',
      minSubtotal: '25',
      startsAt: '2026-11-01T00:00',
      endsAt: '2026-12-01T00:00',
    })

    expect(input).toMatchObject({ description: '$5 off', value: 500, minSubtotal: 2500 })
    expect(input?.startsAt).toBe(new Date('2026-11-01T00:00').toISOString())
  })

  it('reports each bad field once', () => {
    const { input, errors } = couponFromForm({
      ...emptyCouponForm(),
      code: 'BAD CODE',
      value: '150',
      minSubtotal: 'lots',
      startsAt: '2026-12-01T00:00',
      endsAt: '2026-11-01T00:00',
    })

    expect(input).toBeNull()
    expect(errors.map((error) => error.name).sort()).toEqual(['code', 'endsAt', 'minSubtotal', 'value'])
  })

  it('needs a whole percent', () => {
    expect(couponFromForm({ ...emptyCouponForm(), code: 'X', value: '7.5' }).errors).toEqual([
      { name: 'value', message: 'Enter a whole percent' },
    ])
  })
})

describe('describeDiscount', () => {
  it('reads percent and fixed coupons', () => {
    expect(describeDiscount({ type: 'percent', value: 10 })).toBe('10% off')
    expect(describeDiscount({ type: 'fixed', value: 500 })).toBe('$5.00 off')
  })
})
