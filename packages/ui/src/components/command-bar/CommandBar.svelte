<script lang="ts">
import { Popover as PopoverPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { commandBarContentVariants } from "./variants"

type Props = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: Snippet
}

let { open = $bindable(false), defaultOpen = false, onOpenChange, children }: Props = $props()

// An invisible fixed anchor instead of Radix `Popover.Anchor`; bits-ui positions with `customAnchor`.
let anchor = $state<HTMLElement | null>(null)

$effect(() => {
  if (defaultOpen) open = true
})
</script>

<div
  bind:this={anchor}
  aria-hidden="true"
  class="fixed bottom-8 left-1/2 h-px w-px -translate-x-1/2"
></div>

<PopoverPrimitive.Root {open} {onOpenChange}>
  <PopoverPrimitive.Content
    side="top"
    sideOffset={0}
    customAnchor={anchor}
    class={cn(commandBarContentVariants())}
  >
    {@render children?.()}
  </PopoverPrimitive.Content>
</PopoverPrimitive.Root>
