<script lang="ts">
import XMark from "@lucide/svelte/icons/x"
import { Dialog as DialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import IconButton from "../icon-button/IconButton.svelte"
import { focusModalHeaderVariants, focusModalKbdVariants } from "./variants"

type Props = {
  class?: string
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div class={cn(focusModalHeaderVariants(), className)} {...rest}>
  <div class="flex items-center gap-x-2">
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
    <kbd class={cn(focusModalKbdVariants())}>esc</kbd>
  </div>
  {@render children?.()}
</div>
