import { CartError } from "../types"
import { normalizeText } from "./normalize"
import type {
  PersonalizationDefinition,
  PersonalizationField,
  PersonalizationValue,
} from "./schema"

type EnabledDefinition = Extract<PersonalizationDefinition, { enabled: true }>

/** The image field's `media` row (ownership is checked by the caller); `undefined` if missing. */
export type MediaInfo = { mime: string | null; bytes: number | null }
export type MediaLookup = (publicId: string) => MediaInfo | undefined

function fail(key: string, reason: string): never {
  throw new CartError("PERSONALIZATION_INVALID", `${key}: ${reason}`, { key, reason })
}

/** Normalizes a field value; empty becomes `undefined` (not stored, triggers no surcharge). */
function fieldValue(
  field: PersonalizationField,
  raw: unknown,
  media: MediaLookup,
): string | true | undefined {
  if (raw === null || raw === undefined) return undefined
  if (field.type === "boolean") {
    if (typeof raw !== "boolean") fail(field.key, "INVALID_TYPE")
    return raw ? true : undefined
  }
  if (typeof raw !== "string") fail(field.key, "INVALID_TYPE")
  const value = normalizeText(raw, field.type === "text" && field.multiline)
  if (value === "") return undefined
  if (field.type === "text") {
    if ([...value].length > field.maxLength) fail(field.key, "MAX_LENGTH")
    if (field.pattern !== undefined && !matches(field.pattern, value)) fail(field.key, "PATTERN")
  } else if (field.type === "select") {
    if (!field.options.includes(value)) fail(field.key, "INVALID_OPTION")
  } else {
    const info = media(value)
    if (!info) fail(field.key, "MEDIA_NOT_FOUND")
    if (field.mime && (info.mime === null || !field.mime.includes(info.mime))) {
      fail(field.key, "MIME")
    }
    if (field.maxBytes !== undefined && (info.bytes === null || info.bytes > field.maxBytes)) {
      fail(field.key, "TOO_LARGE")
    }
  }
  return value
}

// shortcut: the pattern comes from admin and is anchored for a full match; no ReDoS time limit,
// upgrade once the admin form restricts patterns to a safe subset.
function matches(pattern: string, value: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`, "u").test(value)
  } catch {
    throw new CartError("INVALID_INPUT", "kişiselleştirme deseni geçersiz")
  }
}

/**
 * Server-side validation (05-sepet §1.1), rule order: non-empty input with a disabled/missing
 * definition is `PERSONALIZATION_NOT_ALLOWED`; unknown key; per field type, length, pattern,
 * option, image type/size; required fields last. Empty fields are dropped. Pure: image info comes
 * from `media`.
 */
export function validatePersonalization(
  def: EnabledDefinition | null,
  input: unknown,
  media: MediaLookup = () => undefined,
): PersonalizationValue | null {
  if (input === null || input === undefined) {
    if (def === null) return null
    return validatePersonalization(def, {}, media)
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new CartError("INVALID_INPUT", "kişiselleştirme nesne olmalı")
  }
  const entries = Object.entries(input)
  if (def === null) {
    if (entries.length === 0) return null
    throw new CartError("PERSONALIZATION_NOT_ALLOWED", "bu varyant kişiselleştirilemez")
  }
  const byKey = new Map(def.fields.map((f) => [f.key, f]))
  for (const [key] of entries) {
    if (!byKey.has(key)) fail(key, "UNKNOWN_FIELD")
  }
  const out: PersonalizationValue = {}
  for (const field of def.fields) {
    const value = fieldValue(field, (input as Record<string, unknown>)[field.key], media)
    if (value !== undefined) out[field.key] = value
    else if (field.required) fail(field.key, "REQUIRED")
  }
  return Object.keys(out).length === 0 ? null : out
}
