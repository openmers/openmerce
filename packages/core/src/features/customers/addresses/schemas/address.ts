import { z } from "zod"

const optionalText = (max: number) => z.string().trim().max(max).nullish()

/**
 * Market-neutral address (11-musteriler §4): core only checks format (required fields, postal code shape,
 * E.164 phone). Region lists and country-specific fields belong to country packs (`schemas/<country>.ts`,
 * `custom_fields`); core adds no columns for them.
 */
export const addressSchema = z.object({
  label: optionalText(50),
  firstName: optionalText(100),
  lastName: optionalText(100),
  company: optionalText(200),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: optionalText(200),
  city: z.string().trim().min(1).max(100),
  region: optionalText(100),
  district: optionalText(100),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{1,10}[A-Za-z0-9]$/)
    .nullish(),
  // ISO 3166-1 alpha-2
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((c) => c.toUpperCase()),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/)
    .nullish(),
  taxId: optionalText(50),
  taxIdType: optionalText(30),
  customFields: z.record(z.string(), z.unknown()).nullish(),
})

export type AddressInput = z.input<typeof addressSchema>
export type Address = z.output<typeof addressSchema>
