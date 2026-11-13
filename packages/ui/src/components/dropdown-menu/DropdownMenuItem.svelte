<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { dropdownMenuItemVariants } from "./variants"

type Props = DropdownMenuPrimitive.ItemProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.Item class={cn(dropdownMenuItemVariants(), className)} {...rest}>
  {@render children?.()}
</DropdownMenuPrimitive.Item>
