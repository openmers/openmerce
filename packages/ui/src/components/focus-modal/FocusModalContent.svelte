<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { focusModalContentVariants, focusModalOverlayVariants } from "./variants"

type Props = DialogPrimitive.ContentProps & {
  children?: Snippet
  overlayProps?: DialogPrimitive.OverlayProps
}

let { class: className, children, overlayProps, ...rest }: Props = $props()
</script>

<DialogPrimitive.Portal>
  <DialogPrimitive.Overlay class={cn(focusModalOverlayVariants())} {...overlayProps} />
  <DialogPrimitive.Content class={cn(focusModalContentVariants(), className)} {...rest}>
    {@render children?.()}
  </DialogPrimitive.Content>
</DialogPrimitive.Portal>
