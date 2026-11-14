import { Ellipsis } from "lucide-react"
import { Fragment } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu/DropdownMenu"
import { IconButton } from "../icon-button/IconButton"
import type {
  DataTableAction,
  DataTableCellContext,
  DataTableColumnMeta,
  DataTableRowData,
} from "./types"

const ACTION_ITEM = "flex items-center gap-2 [&>svg]:text-muted-foreground"

export function DataTableActionCell({ ctx }: { ctx: DataTableCellContext<DataTableRowData> }) {
  const source = (ctx.column.columnDef.meta as DataTableColumnMeta | undefined)?.___actions
  if (!source) return null
  const resolved = typeof source === "function" ? source(ctx) : source
  const item = (action: DataTableAction) => (
    <DropdownMenuItem
      key={action.label}
      className={ACTION_ITEM}
      onSelect={() => action.onClick(ctx)}
    >
      {action.icon}
      {action.label}
    </DropdownMenuItem>
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton size="small" variant="transparent" className="ml-1">
          <Ellipsis aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom">
        {resolved.map((actionOrGroup, index) =>
          Array.isArray(actionOrGroup) ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: action groups have no identity of their own
            <Fragment key={index}>
              {actionOrGroup.map(item)}
              {index < resolved.length - 1 && <DropdownMenuSeparator />}
            </Fragment>
          ) : (
            item(actionOrGroup)
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
