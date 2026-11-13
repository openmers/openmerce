<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { dropdownMenuContentVariants } from "./variants"

type Props = DropdownMenuPrimitive.ContentProps & {
  children?: Snippet
}

let {
  class: className,
  children,
  sideOffset = 8,
  collisionPadding = 8,
  align = "center",
  ...rest
}: Props = $props()
</script>

<DropdownMenuPrimitive.Portal>
  <DropdownMenuPrimitive.Content
    {sideOffset}
    {align}
    {collisionPadding}
    class={cn(dropdownMenuContentVariants(), className)}
    {...rest}
  >
    {@render children?.()}
  </DropdownMenuPrimitive.Content>
</DropdownMenuPrimitive.Portal>
