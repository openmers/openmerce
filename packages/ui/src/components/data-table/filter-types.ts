import type { DataTableRenderedContent } from "./types"

export type DataTableFilterType =
  | "radio"
  | "select"
  | "date"
  | "multiselect"
  | "string"
  | "number"
  | "number-range"
  | "boolean"
  | "custom"

export type DataTableFilterOption<T = string> = {
  label: string
  value: T
}

export type DataTableDateComparisonOperator = {
  $gte?: string
  $lte?: string
  $lt?: string
  $gt?: string
}

export type DataTableNumberComparisonOperator = {
  $gte?: number
  $lte?: number
  $lt?: number
  $gt?: number
  $eq?: number
}

interface DataTableBaseFilterProps {
  type: DataTableFilterType
  label: string
}

export interface DataTableRadioFilterProps extends DataTableBaseFilterProps {
  type: "radio"
  options: DataTableFilterOption[]
}

export interface DataTableSelectFilterProps extends DataTableBaseFilterProps {
  type: "select"
  options: DataTableFilterOption[]
}

export interface DataTableDateFilterProps extends DataTableBaseFilterProps {
  type: "date"
  format?: "date" | "date-time"
  rangeOptionLabel?: string
  rangeOptionStartLabel?: string
  rangeOptionEndLabel?: string
  disableRangeOption?: boolean
  formatDateValue?: (value: Date) => string
  options: DataTableFilterOption<DataTableDateComparisonOperator>[]
}

export interface DataTableMultiselectFilterProps extends DataTableBaseFilterProps {
  type: "multiselect"
  options: DataTableFilterOption[]
  searchable?: boolean
}

export interface DataTableStringFilterProps extends DataTableBaseFilterProps {
  type: "string"
  placeholder?: string
}

export interface DataTableNumberFilterProps extends DataTableBaseFilterProps {
  type: "number"
  placeholder?: string
  includeOperators?: boolean
}

export interface DataTableNumberRangeFilterProps extends DataTableBaseFilterProps {
  type: "number-range"
  placeholder?: string
}

export interface DataTableBooleanFilterProps extends DataTableBaseFilterProps {
  type: "boolean"
  trueLabel?: string
  falseLabel?: string
}

export type DataTableCustomFilterRenderProps = {
  value: unknown
  onChange: (value: unknown) => void
  onRemove: () => void
}

export interface DataTableCustomFilterProps extends DataTableBaseFilterProps {
  type: "custom"
  render: (props: DataTableCustomFilterRenderProps) => DataTableRenderedContent
}

export type DataTableFilterProps =
  | DataTableRadioFilterProps
  | DataTableSelectFilterProps
  | DataTableDateFilterProps
  | DataTableMultiselectFilterProps
  | DataTableStringFilterProps
  | DataTableNumberFilterProps
  | DataTableNumberRangeFilterProps
  | DataTableBooleanFilterProps
  | DataTableCustomFilterProps

export type DataTableFilter<T extends DataTableFilterProps = DataTableFilterProps> = T & {
  id: string
}

export type DataTableColumnFilter = {
  id: string
  value: unknown
}
