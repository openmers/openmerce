import {
  CommandBar,
  CommandBarBar,
  CommandBarCommand,
  CommandBarSeparator,
  CommandBarValue,
} from "../CommandBar"

export function CommandBarExample({
  open = false,
  onSelect,
  disabled = false,
}: {
  open?: boolean
  onSelect?: () => void
  disabled?: boolean
}) {
  return (
    <CommandBar open={open}>
      <CommandBarBar>
        <input aria-label="Arama" className="w-40" />
        <CommandBarValue>3 ürün seçildi</CommandBarValue>
        <CommandBarSeparator />
        <CommandBarCommand
          action={() => onSelect?.()}
          label="Sil"
          shortcut="d"
          disabled={disabled}
        />
        <CommandBarCommand action={() => onSelect?.()} label="Arşivle" shortcut="a" />
      </CommandBarBar>
    </CommandBar>
  )
}
