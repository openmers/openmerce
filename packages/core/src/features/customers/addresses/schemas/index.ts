import { CustomerError } from "../../types"
import { type Address, addressSchema } from "./address"

/**
 * Per-country address schemas (`<country>.ts` files, keyed by ISO alpha-2). Only the generic default exists
 * now; a country pack adds its file here. Every country schema must output the generic `Address` shape.
 */
const COUNTRY_SCHEMAS: Readonly<Record<string, typeof addressSchema>> = {}

export function addressSchemaFor(country: string): typeof addressSchema {
  return COUNTRY_SCHEMAS[country.trim().toUpperCase()] ?? addressSchema
}

/** Validates with the country schema; invalid input is `INVALID_INPUT`. */
export function parseAddress(input: unknown): Address {
  const country =
    typeof input === "object" && input && "country" in input ? String(input.country) : ""
  const parsed = addressSchemaFor(country).safeParse(input)
  if (!parsed.success) throw new CustomerError("INVALID_INPUT", parsed.error.message)
  return parsed.data
}

export { type Address, type AddressInput, addressSchema } from "./address"
