<script lang="ts">
import Checkbox from "../checkbox/Checkbox.svelte"
import type { DataTableRow } from "./types"

type Props = {
  row: DataTableRow
}

let { row }: Props = $props()
</script>

<Checkbox
  checked={row.getIsSelected()}
  disabled={!row.getCanSelect()}
  onclick={(event) => event.stopPropagation()}
  onCheckedChange={(checked) => row.toggleSelected(checked === true)}
/>
