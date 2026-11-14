import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../DropdownMenu"

export function DropdownMenuExample({
  onSelect,
  onCheckedChange,
}: {
  onSelect?: () => void
  onCheckedChange?: (value: boolean) => void
}) {
  const [checked, setChecked] = useState(false)
  const [radioValue, setRadioValue] = useState("a")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>İşlemler</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Düzenle</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onSelect}>
          Kopyala
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Arşivle</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={checked}
          onCheckedChange={(value) => {
            setChecked(value)
            onCheckedChange?.(value)
          }}
          // Keep the menu open so several flags can be toggled in a row.
          onSelect={(event) => event.preventDefault()}
        >
          Yayında
        </DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value={radioValue} onValueChange={setRadioValue}>
          <DropdownMenuRadioItem value="a">Günlük</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="b">Haftalık</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Paylaş</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Bağlantı</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
