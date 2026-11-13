<script lang="ts">
import { cn } from "../../../utils/cn"
import type { DataTableBooleanFilterProps } from "../filter-types"

type Props = {
  filter: unknown
  labels?: Pick<DataTableBooleanFilterProps, "trueLabel" | "falseLabel">
  onUpdate: (value: unknown) => void
}

let { filter, labels, onUpdate }: Props = $props()

const options = $derived([
  { value: true, label: labels?.trueLabel ?? "True" },
  { value: false, label: labels?.falseLabel ?? "False" },
])
</script>

<div class="flex flex-col p-1">
  {#each options as option (option.value)}
    {@const isSelected = filter === option.value}
    <button
      type="button"
     
      aria-pressed={isSelected}
      onclick={() => onUpdate(option.value)}
      class={cn(
        "txt-compact-small transition-fg flex items-center gap-2 rounded px-2 py-1",
        "hover:bg-bg-component-hover",
      )}
    >
      <span class="flex size-[15px] shrink-0 items-center justify-center">
        {#if isSelected}
          <span class="size-2 rounded-full bg-foreground"></span>
        {/if}
      </span>
      <span class="min-w-0 truncate">{option.label}</span>
    </button>
  {/each}
</div>
