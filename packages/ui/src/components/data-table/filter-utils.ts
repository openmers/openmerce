import type {
  DataTableBooleanFilterProps,
  DataTableDateComparisonOperator,
  DataTableDateFilterProps,
  DataTableFilter,
  DataTableFilterOption,
} from "./filter-types"

export const DEFAULT_FORMAT_DATE_VALUE = (value: Date) =>
  value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

export const DEFAULT_RANGE_OPTION_LABEL = "Custom"
export const DEFAULT_RANGE_OPTION_START_LABEL = "Starting"
export const DEFAULT_RANGE_OPTION_END_LABEL = "Ending"

export function isEmptyFilterValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
}

export function isDateComparisonOperator(value: unknown): value is DataTableDateComparisonOperator {
  if (typeof value !== "object" || value === null) return false
  const validOperators = ["$gte", "$lte", "$gt", "$lt"]
  const entries = Object.entries(value as Record<string, unknown>)
  const hasAtLeastOne = validOperators.some((operator) => operator in value)
  const allValid = entries.every(
    ([key, entry]) =>
      validOperators.includes(key) && (typeof entry === "string" || entry === undefined),
  )
  return hasAtLeastOne && allValid
}

export function isDateFilterProps(
  value: DataTableFilter | null,
): value is DataTableFilter<DataTableDateFilterProps> {
  return value?.type === "date"
}

export function getFilterOptions<T>(
  filter: DataTableFilter | null,
): DataTableFilterOption<T>[] | null {
  if (!filter || !("options" in filter)) return null
  return (filter.options as DataTableFilterOption<T>[]) ?? null
}

export function getFilterDisplayValue(filter: DataTableFilter | null, value: unknown) {
  const options = getFilterOptions<unknown>(filter)
  let displayValue: string | null = null
  let isCustomRange = false

  if (typeof value === "string") {
    displayValue =
      !options || options.length === 0
        ? value
        : (options.find((option) => option.value === value)?.label ?? null)
  }

  if (typeof value === "number") {
    displayValue = String(value)
  }

  if (typeof value === "boolean") {
    const booleanFilter = filter as DataTableBooleanFilterProps | null
    displayValue = value
      ? (booleanFilter?.trueLabel ?? "True")
      : (booleanFilter?.falseLabel ?? "False")
  }

  if (Array.isArray(value)) {
    displayValue = value
      .map((entry) => options?.find((option) => option.value === entry)?.label)
      .filter(Boolean)
      .join(", ")
  }

  if (isDateComparisonOperator(value)) {
    displayValue = options?.find((option) => matchesDateValue(option.value, value))?.label ?? null

    if (!displayValue && filter?.type === "date") {
      isCustomRange = true
      const format = filter.formatDateValue ?? DEFAULT_FORMAT_DATE_VALUE

      if (value.$gte && !value.$lte) {
        displayValue = `${filter.rangeOptionStartLabel ?? DEFAULT_RANGE_OPTION_START_LABEL} ${format(new Date(value.$gte))}`
      } else if (value.$lte && !value.$gte) {
        displayValue = `${filter.rangeOptionEndLabel ?? DEFAULT_RANGE_OPTION_END_LABEL} ${format(new Date(value.$lte))}`
      } else if (value.$gte && value.$lte) {
        displayValue = `${format(new Date(value.$gte))} - ${format(new Date(value.$lte))}`
      }
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !isDateComparisonOperator(value)
  ) {
    displayValue = formatNumberOperator(value as Record<string, number>)
  }

  return { displayValue, isCustomRange }
}

function matchesDateValue(optionValue: unknown, value: DataTableDateComparisonOperator) {
  if (!isDateComparisonOperator(optionValue)) return false
  return (
    (value.$gte === optionValue.$gte || (!value.$gte && !optionValue.$gte)) &&
    (value.$lte === optionValue.$lte || (!value.$lte && !optionValue.$lte)) &&
    (value.$gt === optionValue.$gt || (!value.$gt && !optionValue.$gt)) &&
    (value.$lt === optionValue.$lt || (!value.$lt && !optionValue.$lt))
  )
}

function formatNumberOperator(value: Record<string, number>) {
  const labels: Record<string, string> = { $eq: "=", $gt: ">", $gte: "≥", $lt: "<", $lte: "≤" }
  const parts = Object.entries(value)
    .filter(([, entry]) => typeof entry === "number")
    .map(([key, entry]) => `${labels[key] ?? key} ${entry}`)
  return parts.length > 0 ? parts.join(" ") : null
}
