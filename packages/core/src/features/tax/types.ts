/** Expected tax errors are typed errors carrying a `code` (same pattern as pricing). */
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

/** ISO 3166-1 alpha-2 country + optional ISO 3166-2 subdivision. */
export type Address = { country: string; region?: string | null }

export type ZoneMember = { country: string; region: string | null }

export type Zone = { id: number; publicId: string; name: string; members: ZoneMember[] }

export type TaxCategory = { id: number; code: string; name: string }

export type TaxRate = {
  id: number
  publicId: string
  zoneId: number
  taxCategoryId: number
  /** `null` = everyone. */
  customerGroupId: number | null
  /** Basis points (20% = 2000). */
  rateBp: number
}

/** In-memory tax table (09-vergi §1: all in memory). */
export type TaxConfig = { zones: Zone[]; categories: TaxCategory[]; rates: TaxRate[] }
