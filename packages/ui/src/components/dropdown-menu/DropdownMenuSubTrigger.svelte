<script lang="ts">
import ChevronRightMini from "@lucide/svelte/icons/chevron-right"
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { dropdownMenuSubTriggerVariants } from "./variants"

type Props = DropdownMenuPrimitive.SubTriggerProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.SubTrigger
  class={cn(dropdownMenuSubTriggerVariants(), className)}
  {...rest}
>
  {@render children?.()}
  <ChevronRightMini class="text-muted-foreground ml-auto" />
</DropdownMenuPrimitive.SubTrigger>
