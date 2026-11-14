import { RadioGroup, RadioGroupChoiceBox, RadioGroupItem } from "../RadioGroup"

export function RadioGroupExample({
  defaultValue = "a",
  disabled = false,
  onValueChange,
}: {
  defaultValue?: string
  disabled?: boolean
  onValueChange?: (v: string) => void
}) {
  return (
    <RadioGroup
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={onValueChange}
      aria-label="Renk"
    >
      <div className="flex gap-x-2">
        <RadioGroupItem value="a" aria-label="Kırmızı" />
        <RadioGroupItem value="b" aria-label="Mavi" />
        <RadioGroupItem value="c" aria-label="Yeşil" disabled />
      </div>
      <RadioGroupChoiceBox value="d" label="Turuncu" description="Sıcak renk" />
    </RadioGroup>
  )
}
