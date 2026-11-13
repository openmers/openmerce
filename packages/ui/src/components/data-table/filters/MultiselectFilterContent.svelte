<script lang="ts">
import Search from "@lucide/svelte/icons/search"
import X from "@lucide/svelte/icons/x"
import Checkbox from "../../checkbox/Checkbox.svelte"
import type { DataTableFilterOption } from "./filter-types"

type Props = {
  value?: string[]
  options: DataTableFilterOption[]
  searchable?: boolean
  onUpdate: (value: unknown) => void
}

let { value = [], options, searchable = true, onUpdate }: Props = $props()

let search = $state("")
const filteredOptions = $derived(
  searchable && search
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
  {#if searchable}
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
  {/if}

  <div class="max-h-[300px] overflow-auto p-1">
    {#if filteredOptions.length === 0}
      <div class="py-6 text-center text-sm text-fg-muted">No results found</div>
    {/if}
    {#each filteredOptions as option (option.value)}
      <button
        type="button"
        onclick={() => toggle(option.value)}
        class="flex w-full cursor-pointer items-center gap-x-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
      >
        <Checkbox checked={value.includes(option.value)} class="pointer-events-none shrink-0" />
        <span class="min-w-0 truncate">{option.label}</span>
      </button>
    {/each}
  </div>
</div>
