<script lang="ts">
import { Tooltip as TooltipPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { tooltipContentVariants } from "./variants"

type Props = {
  /** Tooltip gövdesi. */
  content: Snippet | string
  children?: Snippet
  /** Radix `asChild` karşılığı: tetikleyici öğeye props'ları kendin uygularsın. */
  child?: Snippet<[{ props: Record<string, unknown> }]>
  class?: string
  side?: "bottom" | "left" | "top" | "right"
  sideOffset?: number
  maxWidth?: number
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  skipDelayDuration?: number
  disabled?: boolean
  onClick?: (event: MouseEvent) => void
}

let {
  content,
  children,
  child,
  class: className,
  side,
  sideOffset = 8,
  maxWidth = 220,
  open = $bindable(false),
  onOpenChange,
  delayDuration = 100,
  skipDelayDuration = 300,
  disabled,
  onClick,
}: Props = $props()
</script>

<TooltipPrimitive.Provider {delayDuration} {skipDelayDuration}>
  <TooltipPrimitive.Root bind:open {onOpenChange} {delayDuration} {disabled}>
    <TooltipPrimitive.Trigger {onClick} {child}>
      {@render children?.()}
    </TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        {side}
        {sideOffset}
        align="center"
        class={cn(tooltipContentVariants(), className)}
        style="max-width: {maxWidth}px"
      >
        {#if typeof content === "string"}
          {content}
        {:else}
          {@render content()}
        {/if}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
</TooltipPrimitive.Provider>
