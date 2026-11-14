import { ArrowDown, ArrowUp } from "lucide-react"
import { useState } from "react"
import { cn } from "../../utils/cn"
import { Checkbox } from "../checkbox/Checkbox"
import { Tooltip } from "../tooltip/Tooltip"
import type {
  DataTableHeaderContext,
  DataTableRenderedContent,
  DataTableRowData,
  DataTableRow as DataTableRowType,
  DataTableSortDirection,
} from "./types"

export function DataTableSortingIcon({
  direction,
  firstDirection,
}: {
  direction: DataTableSortDirection | false
  firstDirection?: DataTableSortDirection
}) {
  const isSorted = direction === "asc" || direction === "desc"
  const effective = isSorted ? direction : (firstDirection ?? "asc")
  const Icon = effective === "desc" ? ArrowDown : ArrowUp
  return (
    <Icon
      className={cn("text-fg-muted opacity-0 transition-opacity group-hover:opacity-100", {
        "text-muted-foreground opacity-100": isSorted,
      })}
      aria-hidden="true"
    />
  )
}

export function DataTableSelectCell({ row }: { row: DataTableRowType }) {
  return (
    <Checkbox
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      onCheckedChange={(checked) => row.toggleSelected(checked)}
    />
  )
}

export function DataTableSelectHeader({ ctx }: { ctx: DataTableHeaderContext<DataTableRowData> }) {
  return (
    <Checkbox
      checked={ctx.table.getIsAllPageRowsSelected()}
      indeterminate={ctx.table.getIsSomePageRowsSelected()}
      disabled={!ctx.table.getRowModel().rows.some((row) => row.getCanSelect())}
      onClick={(event) => event.stopPropagation()}
      onCheckedChange={(value) => ctx.table.toggleAllPageRowsSelected(value)}
    />
  )
}

export function DataTableTruncatedCell({
  content,
  truncateTooltip = true,
}: {
  content: DataTableRenderedContent
  truncateTooltip?: boolean
}) {
  const [overflow, setOverflow] = useState(false)
  const [text, setText] = useState("")
  if (!truncateTooltip) return <>{content ?? ""}</>
  return (
    <Tooltip content={text} disabled={!overflow} asChild>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover only measures overflow for the tooltip */}
      <div
        className="truncate"
        onMouseEnter={(event) => {
          const element = event.currentTarget
          setOverflow(element.scrollWidth > element.clientWidth)
          setText(element.textContent ?? "")
        }}
      >
        {content ?? ""}
      </div>
    </Tooltip>
  )
}
