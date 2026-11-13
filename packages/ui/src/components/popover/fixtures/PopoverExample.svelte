<script lang="ts">
import Popover from "../Popover.svelte"
import PopoverClose from "../PopoverClose.svelte"
import PopoverContent from "../PopoverContent.svelte"
import PopoverSeparator from "../PopoverSeparator.svelte"
import PopoverTrigger from "../PopoverTrigger.svelte"

let { open = $bindable(false), contentClass = "" } = $props<{
  open?: boolean
  contentClass?: string
}>()
</script>

<Popover bind:open>
  <PopoverTrigger>Filtreler</PopoverTrigger>
  <PopoverContent class={contentClass}>
    <span>Durum: aktif</span>
    <PopoverSeparator />
    <PopoverClose>Kapat</PopoverClose>
  </PopoverContent>
</Popover>
