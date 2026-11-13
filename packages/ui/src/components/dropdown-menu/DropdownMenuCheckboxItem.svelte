<script lang="ts">
import CheckMini from "@lucide/svelte/icons/check"
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { dropdownMenuCheckboxItemVariants } from "./variants"

type Props = DropdownMenuPrimitive.CheckboxItemProps & {
  children?: Snippet
}

let { class: className, children, checked = $bindable(false), ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.CheckboxItem
  bind:checked
  class={cn(dropdownMenuCheckboxItemVariants(), className)}
  {...rest}
>
  {#snippet children({ checked })}
    <span class="absolute left-2 flex size-[15px] items-center justify-center">
      {#if checked}
        <CheckMini />
      {/if}
    </span>
    {@render children?.()}
  {/snippet}
</DropdownMenuPrimitive.CheckboxItem>
