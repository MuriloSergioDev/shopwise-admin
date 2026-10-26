import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoney, toMoneyInput } from '../../shared/utils/money'

describe('formatMoney', () => {
  it('formats minor units with the currency symbol', () => {
    expect(formatMoney(4500, 'USD')).toBe('$45.00')
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56')
    expect(formatMoney(0, 'USD')).toBe('$0.00')
  })

  it('uses the currency’s own number of decimals', () => {
    expect(formatMoney(500, 'JPY')).toBe('¥500')
  })
})

describe('parseMoney', () => {
  it('reads major units as minor units', () => {
    expect(parseMoney('45', 'USD')).toBe(4500)
    expect(parseMoney('45.5', 'USD')).toBe(4550)
    expect(parseMoney(' $1,045.09 ', 'USD')).toBe(104509)
    expect(parseMoney('0', 'USD')).toBe(0)
    expect(parseMoney('12.', 'USD')).toBe(1200)
    expect(parseMoney('500', 'JPY')).toBe(500)
  })

  it('rejects anything that is not a non-negative amount in the currency’s precision', () => {
    for (const input of ['', 'abc', '-1', '1.234', '1e3', '.5']) {
      expect(parseMoney(input, 'USD')).toBeNull()
    }
    expect(parseMoney('5.5', 'JPY')).toBeNull()
  })

  it('round-trips with toMoneyInput', () => {
    expect(toMoneyInput(4550, 'USD')).toBe('45.50')
    expect(parseMoney(toMoneyInput(4550, 'USD'), 'USD')).toBe(4550)
    expect(toMoneyInput(500, 'JPY')).toBe('500')
  })
})
