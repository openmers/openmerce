import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../Select"

export function SelectExample({
  defaultValue,
  size = "base",
  disabled = false,
  onValueChange,
}: {
  defaultValue?: string
  size?: "base" | "small"
  disabled?: boolean
  onValueChange?: (value: string) => void
}) {
  return (
    <Select
      defaultValue={defaultValue}
      disabled={disabled}
      size={size}
      onValueChange={onValueChange}
    >
      <SelectTrigger aria-label="Bölge">
        <SelectValue placeholder="Bölge seç" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Avrupa</SelectLabel>
          <SelectItem value="tr">Türkiye</SelectItem>
          <SelectItem value="de">Almanya</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value="us">Amerika</SelectItem>
        <SelectItem value="jp" disabled>
          Japonya
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
