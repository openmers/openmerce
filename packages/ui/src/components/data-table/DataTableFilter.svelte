<script lang="ts">
import X from "@lucide/svelte/icons/x"
import { cn } from "../../utils/cn"
import Popover from "../popover/Popover.svelte"
import PopoverContent from "../popover/PopoverContent.svelte"
import PopoverTrigger from "../popover/PopoverTrigger.svelte"
import { getDataTableContext } from "./context"
import type {
  DataTableBooleanFilterProps,
  DataTableCustomFilterProps,
  DataTableDateComparisonOperator,
  DataTableDateFilterProps,
  DataTableFilterOption,
  DataTableNumberFilterProps,
  DataTableNumberRangeFilterProps,
  DataTableSelectFilterProps,
  DataTableStringFilterProps,
} from "./filter-types"
import { getFilterDisplayValue, isDateComparisonOperator } from "./filter-utils"
import BooleanFilterContent from "./filters/BooleanFilterContent.svelte"
import CustomFilterContent from "./filters/CustomFilterContent.svelte"
import DateFilterContent from "./filters/DateFilterContent.svelte"
import MultiselectFilterContent from "./filters/MultiselectFilterContent.svelte"
import NumberFilterContent from "./filters/NumberFilterContent.svelte"
import NumberRangeFilterContent from "./filters/NumberRangeFilterContent.svelte"
import RadioFilterContent from "./filters/RadioFilterContent.svelte"
import SelectFilterContent from "./filters/SelectFilterContent.svelte"
import StringFilterContent from "./filters/StringFilterContent.svelte"

type Props = {
  id: string
  filter: unknown
  isNew?: boolean
  onUpdate?: (value: unknown) => void
  onRemove?: () => void
}

let { id, filter, isNew = false, onUpdate, onRemove }: Props = $props()

const instance = getDataTableContext()
const meta = $derived(instance.getFilterMeta(id))
// A new filter starts open so the user can pick a value.
// svelte-ignore state_referenced_locally
let open = $state(isNew)

$effect(() => {
  if (isNew) open = true
})

const hasValue = $derived.by(() => {
  if (filter === null || filter === undefined) return false
  if (typeof filter === "string" && filter === "") return false
  if (Array.isArray(filter) && filter.length === 0) return false
  if (typeof filter === "number" || typeof filter === "boolean") return true
  if (isDateComparisonOperator(filter)) {
    return Boolean(filter.$gte || filter.$lte || filter.$gt || filter.$lt)
  }
  if (typeof filter === "object" && filter !== null) {
    return Object.keys(filter).length > 0
  }
  return true
})

const display = $derived(getFilterDisplayValue(meta, filter))

function update(value: unknown) {
  if (onUpdate) {
    onUpdate(value)
    return
  }
  instance.updateFilter({ id, value })
}

function remove() {
  if (onRemove) {
    onRemove()
    return
  }
  instance.removeFilter(id)
}

function handleOpenChange(next: boolean) {
  open = next
  if (!next && !hasValue) remove()
}
</script>

{#if meta}
  <Popover bind:open onOpenChange={handleOpenChange}>
    <div
      class={cn(
        "flex shrink-0 items-stretch overflow-hidden rounded-md bg-bg-field",
        "txt-compact-small-plus shadow-borders-base",
      )}
    >
      <div class={cn("flex items-center px-2 py-1 text-fg-muted", { "border-r": hasValue })}>
        {meta.label || id}
      </div>
      {#if hasValue}
        {#if meta.type === "select" || meta.type === "multiselect" || meta.type === "radio"}
          <div class="flex items-center border-r px-2 py-1 text-fg-muted">is</div>
        {/if}
        <PopoverTrigger>
          {#snippet child({ props })}
            <button
              {...props}
              class={cn(
                "flex flex-1 items-center border-r px-2 py-1 outline-hidden",
                "hover:bg-accent active:bg-bg-base-pressed transition-fg",
                {
                  "text-muted-foreground": display.displayValue,
                  "text-fg-muted": !display.displayValue,
                },
              )}
            >
              {display.displayValue ?? "\u00A0"}
            </button>
          {/snippet}
        </PopoverTrigger>
        <button
          type="button"
          aria-label={`Remove ${meta.label || id} filter`}
          class="flex size-7 items-center justify-center text-fg-muted outline-hidden transition-fg hover:bg-accent active:bg-bg-base-pressed"
          onclick={remove}
        >
          <X aria-hidden="true" />
        </button>
      {:else}
        <PopoverTrigger>
          {#snippet child({ props })}
            <button
              {...props}
              aria-label={`Set ${meta.label || id} filter`}
              class="flex min-w-[80px] flex-1 items-center justify-center px-2 py-1 text-fg-muted outline-hidden transition-fg hover:bg-accent active:bg-bg-base-pressed"
            >
              {"\u00A0"}
            </button>
          {/snippet}
        </PopoverTrigger>
      {/if}
    </div>

    <PopoverContent side="bottom" align="start" sideOffset={8} class="bg-popover p-0 outline-hidden">
      {#if meta.type === "select"}
        <SelectFilterContent
          options={(meta as DataTableSelectFilterProps).options}
          value={filter as string[] | undefined}
          onUpdate={update}
        />
      {:else if meta.type === "multiselect"}
        <MultiselectFilterContent
          options={(meta as DataTableSelectFilterProps).options}
          value={filter as string[] | undefined}
          searchable={(meta as { searchable?: boolean }).searchable}
          onUpdate={update}
        />
      {:else if meta.type === "radio"}
        <RadioFilterContent
          options={(meta as DataTableSelectFilterProps).options}
          value={filter}
          onUpdate={update}
        />
      {:else if meta.type === "date"}
        {@const dateMeta = meta as DataTableDateFilterProps}
        <DateFilterContent
          filter={filter}
          options={dateMeta.options as DataTableFilterOption<DataTableDateComparisonOperator>[]}
          isCustomRange={display.isCustomRange}
          format={dateMeta.format}
          rangeOptionLabel={dateMeta.rangeOptionLabel}
          rangeOptionStartLabel={dateMeta.rangeOptionStartLabel}
          rangeOptionEndLabel={dateMeta.rangeOptionEndLabel}
          disableRangeOption={dateMeta.disableRangeOption}
          onUpdate={update}
        />
      {:else if meta.type === "string"}
        <StringFilterContent
          value={filter as string | undefined}
          placeholder={(meta as DataTableStringFilterProps).placeholder}
          onUpdate={update}
        />
      {:else if meta.type === "number"}
        <NumberFilterContent
          filter={filter}
          placeholder={(meta as DataTableNumberFilterProps).placeholder}
          includeOperators={(meta as DataTableNumberFilterProps).includeOperators}
          onUpdate={update}
        />
      {:else if meta.type === "number-range"}
        <NumberRangeFilterContent
          filter={filter}
          placeholder={(meta as DataTableNumberRangeFilterProps).placeholder}
          onUpdate={update}
        />
      {:else if meta.type === "boolean"}
        <BooleanFilterContent
          filter={filter}
          labels={meta as DataTableBooleanFilterProps}
          onUpdate={update}
        />
      {:else if meta.type === "custom"}
        <CustomFilterContent
          filter={filter}
          render={(meta as DataTableCustomFilterProps).render}
          onUpdate={update}
          onRemove={remove}
        />
      {/if}
    </PopoverContent>
  </Popover>
{/if}
