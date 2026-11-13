<script lang="ts">
import { Popover as PopoverPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { popoverContentVariants } from "./variants"

type Props = PopoverPrimitive.ContentProps & {
  children?: Snippet
  /** Medusa `Popover.Anchor` karşılığı: bits-ui konumlandırmayı `customAnchor` ile yapar. */
  anchor?: HTMLElement | string | null
}

let {
  class: className,
  children,
  sideOffset = 8,
  side = "bottom",
  align = "start",
  anchor,
  ...rest
}: Props = $props()
</script>

<PopoverPrimitive.Portal>
  <PopoverPrimitive.Content
    {sideOffset}
    {side}
    {align}
    customAnchor={anchor}
    class={cn(popoverContentVariants(), className)}
    {...rest}
  >
    {@render children?.()}
  </PopoverPrimitive.Content>
</PopoverPrimitive.Portal>
