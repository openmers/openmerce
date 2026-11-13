// Search folding (02-katalog §2): the indexer and the search query use the same helper, so the FTS5
// tokenizer stays language independent. Case and combining marks are folded for every language; letters
// that do not decompose are folded per language from the table below (data, not code paths).

/** Per-language letter folds applied after lowercasing; keyed by the base language subtag. */
export const LANGUAGE_FOLDS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  // dotless ı has no decomposition; "ışık" must match "isik" (İ already folds via NFD)
  tr: { ı: "i" },
  az: { ı: "i" },
}

const MARKS = /\p{M}+/gu

/** Lowercase, strip combining marks, apply the language's letter folds. */
export function foldText(text: string, lang: string): string {
  const folds = LANGUAGE_FOLDS[lang.toLowerCase().split(/[-_]/)[0] ?? ""]
  const base = text.toLowerCase().normalize("NFD").replace(MARKS, "")
  if (!folds) return base
  let out = ""
  for (const ch of base) out += folds[ch] ?? ch
  return out
}

const TOKEN_SPLIT = /[^\p{L}\p{N}]+/u
const MAX_TOKENS = 8

/**
 * Free text → FTS5 MATCH expression: every folded token as a quoted prefix term, all required (AND).
 * Quoting keeps user input out of the FTS5 query syntax. `null` when nothing searchable remains.
 */
export function toMatchQuery(query: string, lang: string): string | null {
  const tokens = foldText(query, lang)
    .split(TOKEN_SPLIT)
    .filter((t) => t.length > 0)
    .slice(0, MAX_TOKENS)
  return tokens.length > 0 ? tokens.map((t) => `"${t}"*`).join(" ") : null
}
