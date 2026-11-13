<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { promptContentVariants, promptOverlayVariants } from "./variants"

type Props = AlertDialogPrimitive.ContentProps & {
  children?: Snippet
  overlayProps?: AlertDialogPrimitive.OverlayProps
}

let { class: className, children, overlayProps, ...rest }: Props = $props()
</script>

<AlertDialogPrimitive.Portal>
  <AlertDialogPrimitive.Overlay class={cn(promptOverlayVariants())} {...overlayProps} />
  <AlertDialogPrimitive.Content class={cn(promptContentVariants(), className)} {...rest}>
    {@render children?.()}
  </AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
