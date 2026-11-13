import { CatalogError } from "./types"

type OptionLike = { code: string; values: ReadonlyArray<{ code: string }> }
type VariantLike = { optionValues?: ReadonlyArray<{ option: string; value: string }> }

/**
 * Combination rule for products with options (02-katalog-ve-arama §1): every variant carries **exactly one
 * value from each option**, never two values from the same option, and the same combination is not
 * repeated across two variants. In a product without options, variants carry no option values. Pure: no DB.
 */
export function assertOptionCombinations(
  options: readonly OptionLike[],
  variants: readonly VariantLike[],
): void {
  const valuesByOption = new Map<string, Set<string>>()
  for (const option of options) {
    const code = option.code.trim()
    if (code.length === 0) throw new CatalogError("INVALID_INPUT", "seçenek kodu boş olamaz")
    if (valuesByOption.has(code)) {
      throw new CatalogError("INVALID_INPUT", `seçenek kodu yineleniyor: ${code}`)
    }
    const values = new Set<string>()
    for (const value of option.values) {
      const valueCode = value.code.trim()
      if (valueCode.length === 0) {
        throw new CatalogError("INVALID_INPUT", `seçenek değeri kodu boş olamaz: ${code}`)
      }
      if (values.has(valueCode)) {
        throw new CatalogError("INVALID_INPUT", `seçenek değeri yineleniyor: ${code}=${valueCode}`)
      }
      values.add(valueCode)
    }
    if (values.size === 0) {
      throw new CatalogError("INVALID_INPUT", `seçeneğin değeri yok: ${code}`)
    }
    valuesByOption.set(code, values)
  }

  const combinations = new Set<string>()
  for (const variant of variants) {
    const picked = new Map<string, string>()
    for (const entry of variant.optionValues ?? []) {
      const option = entry.option.trim()
      const values = valuesByOption.get(option)
      if (!values) {
        throw new CatalogError("INVALID_INPUT", `bilinmeyen seçenek: ${option}`)
      }
      if (picked.has(option)) {
        throw new CatalogError("INVALID_INPUT", `seçenekten birden çok değer: ${option}`)
      }
      if (!values.has(entry.value.trim())) {
        throw new CatalogError(
          "INVALID_INPUT",
          `bilinmeyen seçenek değeri: ${option}=${entry.value}`,
        )
      }
      picked.set(option, entry.value.trim())
    }
    if (picked.size !== valuesByOption.size) {
      throw new CatalogError("INVALID_INPUT", "varyant her seçenekten bir değer taşımalı")
    }
    const key = [...valuesByOption.keys()]
      .sort()
      .map((option) => `${option}=${picked.get(option)}`)
      .join("|")
    if (key.length > 0 && combinations.has(key)) {
      throw new CatalogError("INVALID_INPUT", `kombinasyon yineleniyor: ${key}`)
    }
    combinations.add(key)
  }
}
