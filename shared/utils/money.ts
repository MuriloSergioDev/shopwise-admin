const fractionDigits = (currency: string): number =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2

/** Formats an amount in minor units (cents for USD) for display, using the currency's own number of decimals. */
export function formatMoney(amount: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 10 ** fractionDigits(currency))
}

/** An amount in minor units as an admin would type it in major units: `4500` USD is `45.00`. */
export function toMoneyInput(amount: number, currency: string): string {
  return (amount / 10 ** fractionDigits(currency)).toFixed(fractionDigits(currency))
}

/**
 * Reads an amount typed in major units (`45`, `45.5`, `$1,045.00`) as minor units. Returns null for anything that
 * is not a non-negative amount with at most the currency's number of decimals.
 */
export function parseMoney(input: string, currency: string): number | null {
  const digits = fractionDigits(currency)
  const match = /^(\d+)(?:\.(\d*))?$/.exec(input.trim().replace(/^\$/, '').replace(/,/g, ''))
  if (!match || (match[2]?.length ?? 0) > digits) {
    return null
  }

  return Number(match[1]) * 10 ** digits + Number((match[2] ?? '').padEnd(digits, '0') || 0)
}
