<script lang="ts">
import Checkbox from "../checkbox/Checkbox.svelte"
import type { DataTableHeaderContext, DataTableRowData } from "./types"

type Props = {
  ctx: DataTableHeaderContext<DataTableRowData>
}

let { ctx }: Props = $props()

const checked = $derived(
  ctx.table.getIsSomePageRowsSelected() ? "indeterminate" : ctx.table.getIsAllPageRowsSelected(),
)
const disabled = $derived(!ctx.table.getRowModel().rows.some((row) => row.getCanSelect()))
</script>

<Checkbox
  {checked}
  {disabled}
  onclick={(event) => event.stopPropagation()}
  onCheckedChange={(value) => ctx.table.toggleAllPageRowsSelected(value === true)}
/>
