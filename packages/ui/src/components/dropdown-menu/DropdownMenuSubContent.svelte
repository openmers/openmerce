<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { dropdownMenuContentVariants } from "./variants"

type Props = DropdownMenuPrimitive.SubContentProps & {
  children?: Snippet
}

let { class: className, children, collisionPadding = 8, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.Portal>
  <DropdownMenuPrimitive.SubContent
    {collisionPadding}
    class={cn(dropdownMenuContentVariants(), className)}
    {...rest}
  >
    {@render children?.()}
  </DropdownMenuPrimitive.SubContent>
</DropdownMenuPrimitive.Portal>
