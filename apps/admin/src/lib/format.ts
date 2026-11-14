// shortcut: fixed en-US formatting, switch to the admin's locale with i18n (Lingui).
const LOCALE = "en-US"

/** Amounts are integers in the currency's minor unit. */
export function formatMoney(minor: number, currency: string): string {
  const format = new Intl.NumberFormat(LOCALE, { style: "currency", currency })
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2
  return format.format(minor / 10 ** digits)
}

const dateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" })

/** Timestamps are epoch milliseconds. */
export function formatDate(ms: number): string {
  return dateFormat.format(new Date(ms))
}
