<script lang="ts">
import RadioGroup from "../RadioGroup.svelte"
import RadioGroupChoiceBox from "../RadioGroupChoiceBox.svelte"
import RadioGroupItem from "../RadioGroupItem.svelte"

let {
  value = $bindable("a"),
  disabled = false,
  onValueChange,
} = $props<{ value?: string; disabled?: boolean; onValueChange?: (v: string) => void }>()
</script>

<RadioGroup bind:value {disabled} {onValueChange} aria-label="Renk">
  <div class="flex gap-x-2">
    <RadioGroupItem value="a" aria-label="Kırmızı" />
    <RadioGroupItem value="b" aria-label="Mavi" />
    <RadioGroupItem value="c" aria-label="Yeşil" disabled />
  </div>
  <RadioGroupChoiceBox value="d" label="Turuncu" description="Sıcak renk" />
</RadioGroup>
