<script lang="ts">
import { cn } from "../../../utils/cn"
import type { DataTableFilterOption } from "./filter-types"

type Props = {
  value: unknown
  options: DataTableFilterOption[]
  onUpdate: (value: unknown) => void
}

let { value, options, onUpdate }: Props = $props()
</script>

<div class="flex flex-col p-1 outline-hidden">
  {#each options as option (option.value)}
    {@const isSelected = value === option.value}
    <button
      type="button"
     
      aria-pressed={isSelected}
      onclick={() => onUpdate(option.value)}
      class={cn(
        "txt-compact-small transition-fg flex items-center gap-2 rounded px-2 py-1 outline-hidden",
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
