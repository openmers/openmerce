<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { drawerContentVariants, drawerOverlayVariants } from "./variants"

type Props = DialogPrimitive.ContentProps & {
  children?: Snippet
  overlayProps?: DialogPrimitive.OverlayProps
}

let { class: className, children, overlayProps, ...rest }: Props = $props()
</script>

<DialogPrimitive.Portal>
  <DialogPrimitive.Overlay class={cn(drawerOverlayVariants())} {...overlayProps} />
  <DialogPrimitive.Content class={cn(drawerContentVariants(), className)} {...rest}>
    {@render children?.()}
  </DialogPrimitive.Content>
</DialogPrimitive.Portal>
