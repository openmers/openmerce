<script lang="ts">
import CommandBar from "../CommandBar.svelte"
import CommandBarBar from "../CommandBarBar.svelte"
import CommandBarCommand from "../CommandBarCommand.svelte"
import CommandBarSeparator from "../CommandBarSeparator.svelte"
import CommandBarValue from "../CommandBarValue.svelte"

let {
  open = $bindable(false),
  onSelect,
  disabled = false,
} = $props<{
  open?: boolean
  onSelect?: () => void
  disabled?: boolean
}>()
</script>

<CommandBar bind:open>
  <CommandBarBar>
    <input aria-label="Arama" class="w-40" />
    <CommandBarValue>3 ürün seçildi</CommandBarValue>
    <CommandBarSeparator />
    <CommandBarCommand action={() => onSelect?.()} label="Sil" shortcut="d" {disabled} />
    <CommandBarCommand action={() => onSelect?.()} label="Arşivle" shortcut="a" />
  </CommandBarBar>
</CommandBar>
