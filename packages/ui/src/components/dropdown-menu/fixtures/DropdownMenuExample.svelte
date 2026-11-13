<script lang="ts">
import DropdownMenu from "../DropdownMenu.svelte"
import DropdownMenuCheckboxItem from "../DropdownMenuCheckboxItem.svelte"
import DropdownMenuContent from "../DropdownMenuContent.svelte"
import DropdownMenuItem from "../DropdownMenuItem.svelte"
import DropdownMenuLabel from "../DropdownMenuLabel.svelte"
import DropdownMenuRadioGroup from "../DropdownMenuRadioGroup.svelte"
import DropdownMenuRadioItem from "../DropdownMenuRadioItem.svelte"
import DropdownMenuSeparator from "../DropdownMenuSeparator.svelte"
import DropdownMenuShortcut from "../DropdownMenuShortcut.svelte"
import DropdownMenuSub from "../DropdownMenuSub.svelte"
import DropdownMenuSubContent from "../DropdownMenuSubContent.svelte"
import DropdownMenuSubTrigger from "../DropdownMenuSubTrigger.svelte"
import DropdownMenuTrigger from "../DropdownMenuTrigger.svelte"

let {
  open = $bindable(false),
  onSelect,
  onCheckedChange,
  radioValue = $bindable("a"),
  checked = $bindable(false),
} = $props<{
  open?: boolean
  onSelect?: () => void
  onCheckedChange?: (value: boolean) => void
  radioValue?: string
  checked?: boolean
}>()
</script>

<DropdownMenu bind:open>
  <DropdownMenuTrigger>İşlemler</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuLabel>Düzenle</DropdownMenuLabel>
      <DropdownMenuItem onSelect={onSelect}>
        Kopyala
        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem disabled>Arşivle</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem bind:checked onCheckedChange={onCheckedChange}>
        Yayında
      </DropdownMenuCheckboxItem>
      <DropdownMenuRadioGroup bind:value={radioValue}>
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
