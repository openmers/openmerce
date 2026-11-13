<script lang="ts">
import Select from "../Select.svelte"
import SelectContent from "../SelectContent.svelte"
import SelectGroup from "../SelectGroup.svelte"
import SelectItem from "../SelectItem.svelte"
import SelectLabel from "../SelectLabel.svelte"
import SelectSeparator from "../SelectSeparator.svelte"
import SelectTrigger from "../SelectTrigger.svelte"
import SelectValue from "../SelectValue.svelte"

let {
  value = $bindable(""),
  size = "base",
  disabled = false,
  onValueChange,
} = $props<{
  value?: string
  size?: "base" | "small"
  disabled?: boolean
  onValueChange?: (value: string) => void
}>()
</script>

<Select type="single" bind:value {disabled} {size} {onValueChange}>
  <SelectTrigger aria-label="Bölge">
    <SelectValue placeholder="Bölge seç" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Avrupa</SelectLabel>
      <SelectItem value="tr" label="Türkiye">Türkiye</SelectItem>
      <SelectItem value="de" label="Almanya">Almanya</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectItem value="us" label="Amerika">Amerika</SelectItem>
    <SelectItem value="jp" label="Japonya" disabled>Japonya</SelectItem>
  </SelectContent>
</Select>
