<script lang="ts">
import Check from "@lucide/svelte/icons/check"
import Search from "@lucide/svelte/icons/search"
import X from "@lucide/svelte/icons/x"
import { cn } from "../../../utils/cn"
import type { DataTableFilterOption } from "./filter-types"

type Props = {
  value?: string[]
  options: DataTableFilterOption[]
  onUpdate: (value: unknown) => void
}

let { value = [], options, onUpdate }: Props = $props()

let search = $state("")
const filteredOptions = $derived(
  search
    ? options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()))
    : options,
)

function toggle(optionValue: string) {
  if (value.includes(optionValue)) {
    const next = value.filter((entry) => entry !== optionValue)
    onUpdate(next.length > 0 ? next : undefined)
    return
  }
  onUpdate([...value, optionValue])
}
</script>

<div class="w-[250px]">
  <div class="flex items-center gap-x-2 border-b px-3 py-1.5">
    <Search class="size-4 text-fg-muted" aria-hidden="true" />
    <input
      bind:value={search}
      placeholder="Search..."
      aria-label="Search options"
      class="h-8 flex-1 bg-transparent text-sm outline-hidden placeholder:text-fg-muted"
    />
    {#if search}
      <button
        type="button"
        aria-label="Clear search"
        class="text-fg-muted hover:text-muted-foreground"
        onclick={() => (search = "")}
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    {/if}
  </div>

  <div class="max-h-[300px] overflow-auto p-1">
    {#if filteredOptions.length === 0}
      <div class="py-6 text-center text-sm text-fg-muted">No results found</div>
    {/if}
    {#each filteredOptions as option (option.value)}
      {@const isSelected = value.includes(option.value)}
      <button
        type="button"
        aria-pressed={isSelected}
        onclick={() => toggle(option.value)}
        class={cn(
          "flex w-full cursor-pointer items-center gap-x-2 rounded-md px-2 py-1.5 text-left text-sm",
          "hover:bg-accent",
        )}
      >
        <span class="flex size-[15px] shrink-0 items-center justify-center">
          {#if isSelected}<Check aria-hidden="true" />{/if}
        </span>
        <span class="min-w-0 truncate">{option.label}</span>
      </button>
    {/each}
  </div>
</div>
