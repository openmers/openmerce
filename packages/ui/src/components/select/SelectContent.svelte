<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { selectContentVariants, selectViewportVariants } from "./variants"

type Props = SelectPrimitive.ContentProps & {
  children?: Snippet
}

let { class: className, children, sideOffset = 8, collisionPadding = 24, ...rest }: Props = $props()
</script>

<SelectPrimitive.Portal>
  <SelectPrimitive.Content
    {sideOffset}
    {collisionPadding}
    class={cn(selectContentVariants(), className)}
    {...rest}
  >
    <SelectPrimitive.Viewport class={cn(selectViewportVariants())}>
      {@render children?.()}
    </SelectPrimitive.Viewport>
  </SelectPrimitive.Content>
</SelectPrimitive.Portal>
