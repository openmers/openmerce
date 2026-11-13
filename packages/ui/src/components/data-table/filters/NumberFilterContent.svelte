<script lang="ts">
import Input from "../../input/Input.svelte"
import Select from "../../select/Select.svelte"
import SelectContent from "../../select/SelectContent.svelte"
import SelectItem from "../../select/SelectItem.svelte"
import SelectTrigger from "../../select/SelectTrigger.svelte"
import SelectValue from "../../select/SelectValue.svelte"

type Props = {
  filter: unknown
  placeholder?: string
  includeOperators?: boolean
  onUpdate: (value: unknown) => void
}

const operators = [
  { value: "eq", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
]

let { filter, placeholder = "Enter number...", includeOperators = true, onUpdate }: Props = $props()

let operator = $state("eq")
let value = $state("")
let timer: ReturnType<typeof setTimeout> | undefined

$effect(() => {
  if (typeof filter === "number") {
    operator = "eq"
    value = String(filter)
    return
  }
  if (filter && typeof filter === "object") {
    const key = Object.keys(filter)[0]
    const entry = (filter as Record<string, unknown>)[key]
    operator = key.replace("$", "")
    value = String(entry)
  }
})

$effect(() => {
  return () => {
    if (timer) clearTimeout(timer)
  }
})

function commit(nextValue: string, nextOperator: string) {
  const parsed = Number.parseFloat(nextValue)
  if (Number.isNaN(parsed)) {
    if (nextValue === "") onUpdate(undefined)
    return
  }
  onUpdate(includeOperators && nextOperator !== "eq" ? { [`$${nextOperator}`]: parsed } : parsed)
}

function handleInput(nextValue: string) {
  value = nextValue
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => commit(nextValue, operator), 500)
}

function handleOperator(nextOperator: string) {
  operator = nextOperator
  commit(value, nextOperator)
}
</script>

<div class="flex w-[250px] flex-col gap-3 p-3">
  {#if includeOperators}
    <Select value={operator} onValueChange={handleOperator}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {#each operators as entry (entry.value)}
          <SelectItem value={entry.value}>{entry.label}</SelectItem>
        {/each}
      </SelectContent>
    </Select>
  {/if}

  <Input
    type="number"
    {placeholder}
    value={value}
    oninput={(event) => handleInput(event.currentTarget.value)}
    onkeydown={(event) => {
      if (event.key === "Enter") commit(value, operator)
    }}
    autoFocus={!includeOperators}
  />
</div>
