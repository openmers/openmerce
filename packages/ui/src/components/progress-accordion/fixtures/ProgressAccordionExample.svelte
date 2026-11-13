<script lang="ts">
import ProgressAccordion from "../ProgressAccordion.svelte"
import ProgressAccordionContent from "../ProgressAccordionContent.svelte"
import ProgressAccordionHeader from "../ProgressAccordionHeader.svelte"
import ProgressAccordionItem from "../ProgressAccordionItem.svelte"

let { value = $bindable("adres"), onValueChange } = $props<{
  value?: string
  onValueChange?: (value: string) => void
}>()
</script>

<ProgressAccordion type="single" bind:value {onValueChange} aria-label="Sipariş">
  <ProgressAccordionItem value="adres">
    <ProgressAccordionHeader status="completed">Adres</ProgressAccordionHeader>
    <ProgressAccordionContent>Adres bilgileri</ProgressAccordionContent>
  </ProgressAccordionItem>
  <ProgressAccordionItem value="odeme">
    <ProgressAccordionHeader status="in-progress">Ödeme</ProgressAccordionHeader>
    <ProgressAccordionContent>Ödeme bilgileri</ProgressAccordionContent>
  </ProgressAccordionItem>
</ProgressAccordion>
