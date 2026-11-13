<script lang="ts">
import { RadioGroup as RadioGroupPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { radioGroupIndicatorVariants, radioGroupItemVariants } from "./variants"

type Props = RadioGroupPrimitive.ItemProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<RadioGroupPrimitive.Item class={cn(radioGroupItemVariants(), className)} {...rest}>
  {#snippet children({ checked })}
    <div class={radioGroupIndicatorVariants()} data-indicator="">
      {#if checked}
        <div class="bg-card shadow-details-contrast-on-bg-interactive h-1.5 w-1.5 rounded-full"></div>
      {:else}
        {@render children?.()}
      {/if}
    </div>
  {/snippet}
</RadioGroupPrimitive.Item>
