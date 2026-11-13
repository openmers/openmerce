<script lang="ts">
import Input from "../../input/Input.svelte"
import Label from "../../label/Label.svelte"
import type { DataTableNumberComparisonOperator } from "../filter-types"

type Props = {
  filter: unknown
  placeholder?: string
  onUpdate: (value: unknown) => void
}

let { filter, placeholder = "Enter number...", onUpdate }: Props = $props()

const current = $derived(
  (filter && typeof filter === "object" ? filter : {}) as DataTableNumberComparisonOperator,
)
let min = $state("")
let max = $state("")
let timer: ReturnType<typeof setTimeout> | undefined

$effect(() => {
  min = current.$gte !== undefined ? String(current.$gte) : ""
  max = current.$lte !== undefined ? String(current.$lte) : ""
})

$effect(() => {
  return () => {
    if (timer) clearTimeout(timer)
  }
})

function commit(nextMin: string, nextMax: string) {
  const next: DataTableNumberComparisonOperator = {}
  if (nextMin !== "") next.$gte = Number.parseFloat(nextMin)
  if (nextMax !== "") next.$lte = Number.parseFloat(nextMax)
  onUpdate(Object.keys(next).length > 0 ? next : undefined)
}

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => commit(min, max), 500)
}
</script>

<div class="flex w-[250px] flex-col gap-3 p-3">
  <div class="flex flex-col gap-1">
    <Label size="xsmall" weight="plus" for="data-table-range-min">Min</Label>
    <Input
      id="data-table-range-min"
      type="number"
      placeholder={placeholder}
      value={min}
      oninput={(event) => {
        min = event.currentTarget.value
        schedule()
      }}
    />
  </div>
  <div class="flex flex-col gap-1">
    <Label size="xsmall" weight="plus" for="data-table-range-max">Max</Label>
    <Input
      id="data-table-range-max"
      type="number"
      placeholder={placeholder}
      value={max}
      oninput={(event) => {
        max = event.currentTarget.value
        schedule()
      }}
    />
  </div>
</div>
