<script lang="ts">
import EllipseMiniSolid from "@lucide/svelte/icons/ellipse"
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { dropdownMenuRadioItemVariants } from "./variants"

type Props = DropdownMenuPrimitive.RadioItemProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.RadioItem class={cn(dropdownMenuRadioItemVariants(), className)} {...rest}>
  {#snippet children({ checked })}
    <span class="absolute left-2 flex size-[15px] items-center justify-center">
      {#if checked}
        <EllipseMiniSolid class="fill-foreground size-2" />
      {/if}
    </span>
    {@render children?.()}
  {/snippet}
</DropdownMenuPrimitive.RadioItem>
