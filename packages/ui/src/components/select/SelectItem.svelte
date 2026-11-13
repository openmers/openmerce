<script lang="ts">
import Check from "@lucide/svelte/icons/check"
import { Select as SelectPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { selectItemVariants } from "./variants"

type Props = SelectPrimitive.ItemProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<SelectPrimitive.Item class={cn(selectItemVariants(), className)} {...rest}>
  {#snippet children({ selected })}
    <span class="flex h-[15px] w-[15px] items-center justify-center">
      {#if selected}
        <Check />
      {/if}
    </span>
    <span class="flex-1 truncate">{@render children?.()}</span>
  {/snippet}
</SelectPrimitive.Item>
