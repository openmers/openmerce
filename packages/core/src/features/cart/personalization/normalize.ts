// Control characters (C0, DEL, C1) and Unicode format/separator controls; multiline keeps `\n`.
// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
const CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2066-\u2069]/g
// biome-ignore lint/suspicious/noControlCharactersInRegex: line breaks included
const CONTROL_SINGLE_LINE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2066-\u2069]/g

/**
 * Text normalization (05-sepet §1.1 rule 3): `\r\n` -> `\n`, Unicode NFC, control characters
 * removed, leading/trailing whitespace trimmed. HTML is not interpreted (escaping is the printer's
 * job); empty result is `""`.
 */
export function normalizeText(value: string, multiline = false): string {
  const unified = value.replace(/\r\n?/g, "\n").normalize("NFC")
  const stripped = unified.replace(multiline ? CONTROL : CONTROL_SINGLE_LINE, "")
  return stripped.trim()
}

/** Canonical JSON: sorted keys, no whitespace (`line_key` input; values already normalized). */
export function canonicalJson(value: Readonly<Record<string, string | true>>): string {
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(value[k])}`).join(",")}}`
}
