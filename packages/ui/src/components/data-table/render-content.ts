import type { Snippet } from "svelte"
import type {
  DataTableCellContext,
  DataTableColumn,
  DataTableHeaderContext,
  DataTableRenderedContent,
  DataTableRowData,
} from "./types"

function normalize(value: unknown): DataTableRenderedContent {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  if (typeof value === "function") return value as Snippet
  if (value instanceof Date) return value.toLocaleDateString()
  if (Array.isArray(value)) return value.join(", ")
  return String(value)
}

export function getCellContent<TData extends DataTableRowData>(
  ctx: DataTableCellContext<TData>,
): DataTableRenderedContent {
  const renderer = ctx.column.columnDef.cell
  if (typeof renderer === "function") return renderer(ctx)
  return normalize(ctx.getValue())
}

export function getHeaderContent<TData extends DataTableRowData>(
  ctx: DataTableHeaderContext<TData>,
): DataTableRenderedContent {
  const renderer = ctx.column.columnDef.header
  if (typeof renderer === "function") return renderer(ctx)
  if (typeof renderer === "string") return renderer
  return normalize(ctx.column.id)
}

export function getSortLabel(column: DataTableColumn) {
  const meta = column.columnDef.meta as { ___sortMetaData?: { sortLabel?: string } } | undefined
  const header = column.columnDef.header
  return (
    meta?.___sortMetaData?.sortLabel ??
    (typeof header === "string" ? header : undefined) ??
    column.id
  )
}

export function getSortDescriptor(direction: "asc" | "desc", column?: DataTableColumn) {
  if (!column) return null
  const meta = column.columnDef.meta as
    | { ___sortMetaData?: { sortAscLabel?: string; sortDescLabel?: string } }
    | undefined
  return direction === "asc"
    ? (meta?.___sortMetaData?.sortAscLabel ?? "A-Z")
    : (meta?.___sortMetaData?.sortDescLabel ?? "Z-A")
}
