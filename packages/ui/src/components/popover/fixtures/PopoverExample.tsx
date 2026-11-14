import { Popover, PopoverClose, PopoverContent, PopoverSeparator, PopoverTrigger } from "../Popover"

export function PopoverExample({
  open,
  contentClass = "",
}: {
  open?: boolean
  contentClass?: string
}) {
  return (
    <Popover open={open}>
      <PopoverTrigger>Filtreler</PopoverTrigger>
      <PopoverContent className={contentClass}>
        <span>Durum: aktif</span>
        <PopoverSeparator />
        <PopoverClose>Kapat</PopoverClose>
      </PopoverContent>
    </Popover>
  )
}
