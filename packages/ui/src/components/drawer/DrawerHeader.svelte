<script lang="ts">
import XMark from "@lucide/svelte/icons/x"
import { Dialog as DialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import IconButton from "../icon-button/IconButton.svelte"
import { drawerHeaderVariants, drawerKbdVariants } from "./variants"

type Props = {
  class?: string
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div class={cn(drawerHeaderVariants())} {...rest}>
  <div class={cn("flex flex-col gap-y-1", className)}>
    {@render children?.()}
  </div>
  <div class="flex items-center gap-x-2">
    <kbd class={cn(drawerKbdVariants())}>esc</kbd>
    <DialogPrimitive.Close>
      {#snippet child({ props })}
        <IconButton
          {...(props as HTMLButtonAttributes)}
          size="small"
          type="button"
          variant="transparent"
          aria-label="Kapat"
        >
          <XMark />
        </IconButton>
      {/snippet}
    </DialogPrimitive.Close>
  </div>
</div>
