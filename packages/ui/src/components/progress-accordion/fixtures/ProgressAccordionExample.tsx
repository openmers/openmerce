import {
  ProgressAccordion,
  ProgressAccordionContent,
  ProgressAccordionHeader,
  ProgressAccordionItem,
} from "../ProgressAccordion"

export function ProgressAccordionExample({
  onValueChange,
}: {
  onValueChange?: (value: string) => void
}) {
  return (
    <ProgressAccordion
      type="single"
      collapsible
      defaultValue="adres"
      onValueChange={onValueChange}
      aria-label="Sipariş"
    >
      <ProgressAccordionItem value="adres">
        <ProgressAccordionHeader status="completed">Adres</ProgressAccordionHeader>
        <ProgressAccordionContent>Adres bilgileri</ProgressAccordionContent>
      </ProgressAccordionItem>
      <ProgressAccordionItem value="odeme">
        <ProgressAccordionHeader status="in-progress">Ödeme</ProgressAccordionHeader>
        <ProgressAccordionContent>Ödeme bilgileri</ProgressAccordionContent>
      </ProgressAccordionItem>
    </ProgressAccordion>
  )
}
