/** Beklenen vergi hataları `code` taşıyan tipli hatadır (fiyatla aynı desen). */
export type TaxErrorCode = "INVALID_INPUT"

export class TaxError extends Error {
  constructor(
    readonly code: TaxErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "TaxError"
  }
}

/** ISO 3166-1 alpha-2 ülke + isteğe bağlı ISO 3166-2 alt bölge. */
export type Address = { country: string; region?: string | null }

export type ZoneMember = { country: string; region: string | null }

export type Zone = { id: number; publicId: string; name: string; members: ZoneMember[] }

export type TaxCategory = { id: number; code: string; name: string }

export type TaxRate = {
  id: number
  publicId: string
  zoneId: number
  taxCategoryId: number
  /** `null` = herkes. */
  customerGroupId: number | null
  /** Baz puan (%20 = 2000). */
  rateBp: number
}

/** Bellekteki vergi tablosu (09-vergi §1: tümü bellekte). */
export type TaxConfig = { zones: Zone[]; categories: TaxCategory[]; rates: TaxRate[] }
