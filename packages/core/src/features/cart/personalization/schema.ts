import { z } from "zod"

// 05-sepet §1.1: closed schema (no arbitrary code), at most 10 fields. `label`/`options` are
// translatable text; validation only looks at option values.

const key = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/)
const label = z.union([z.string(), z.record(z.string(), z.string())]).optional()
const base = { key, label, required: z.boolean().default(false), customizesGoods: z.boolean() }

const textField = z.object({
  ...base,
  type: z.literal("text"),
  maxLength: z.number().int().min(1).max(1000).default(250),
  pattern: z.string().max(200).optional(),
  multiline: z.boolean().default(false),
  customizesGoods: z.boolean().default(true),
})
const selectField = z.object({
  ...base,
  type: z.literal("select"),
  options: z.array(z.string().min(1)).min(1).max(50),
  customizesGoods: z.boolean().default(true),
})
const imageField = z.object({
  ...base,
  type: z.literal("image"),
  maxBytes: z.number().int().positive().optional(),
  mime: z.array(z.string()).min(1).optional(),
  customizesGoods: z.boolean().default(true),
})
const booleanField = z.object({
  ...base,
  type: z.literal("boolean"),
  customizesGoods: z.boolean().default(false),
})

const money = z.number().int().nonnegative()
const currency = z.string().regex(/^[A-Z]{3}$/)

/** When the field is filled: fixed amount (per currency) or integer percent of the list price. */
const surchargeRule = z.union([
  z.object({ when: key, amount: money, currency }),
  z.object({ when: key, amount: z.record(currency, money) }),
  z.object({ when: key, percent: z.number().int().min(0).max(100) }),
])

export const personalizationField = z.discriminatedUnion("type", [
  textField,
  selectField,
  imageField,
  booleanField,
])

export const personalizationDefinition = z.union([
  z.object({ enabled: z.literal(false) }),
  z
    .object({
      enabled: z.literal(true),
      fields: z.array(personalizationField).min(1).max(10),
      surcharge: z.array(surchargeRule).default([]),
    })
    .refine((d) => new Set(d.fields.map((f) => f.key)).size === d.fields.length, {
      message: "alan anahtarları benzersiz olmalı",
    })
    .refine((d) => d.surcharge.every((r) => d.fields.some((f) => f.key === r.when)), {
      message: "ek ücret tanımda olmayan alana bağlı",
    }),
])

export type PersonalizationField = z.infer<typeof personalizationField>
export type PersonalizationDefinition = z.infer<typeof personalizationDefinition>
export type SurchargeRule = z.infer<typeof surchargeRule>
/** Validated, normalized value: no empty fields; image fields hold the `media` `public_id`. */
export type PersonalizationValue = Record<string, string | true>

/**
 * Effective definition of a variant: `null` on the variant inherits from the product,
 * `{ enabled: false }` disables. A malformed definition (written outside admin validation) counts
 * as disabled: the storefront flag is never trusted.
 */
export function effectiveDefinition(
  product: unknown,
  variant: unknown,
): Extract<PersonalizationDefinition, { enabled: true }> | null {
  const raw = variant ?? product
  if (raw === null || raw === undefined) return null
  const parsed = personalizationDefinition.safeParse(raw)
  if (!parsed.success || !parsed.data.enabled) return null
  return parsed.data
}
