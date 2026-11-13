<script lang="ts">
import { cn } from "../../../utils/cn"
import DataTableContent from "../DataTableContent.svelte"
import type { DataTableCustomFilterRenderProps } from "../filter-types"
import type { DataTableRenderedContent } from "../types"

type Props = {
  render: (props: DataTableCustomFilterRenderProps) => DataTableRenderedContent
  filter: unknown
  onUpdate: (value: unknown) => void
  onRemove: () => void
}

let { render, filter, onUpdate, onRemove }: Props = $props()

const content = $derived(render({ value: filter, onChange: onUpdate, onRemove }))
</script>

<div class={cn("min-w-[250px]")}>
  <DataTableContent {content} />
</div>
