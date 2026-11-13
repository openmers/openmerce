<script lang="ts">
import CheckMini from "@lucide/svelte/icons/check"
import MinusMini from "@lucide/svelte/icons/minus"
import { Checkbox as CheckboxPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import { checkboxIndicatorVariants, checkboxVariants } from "./variants"

type Props = CheckboxPrimitive.RootProps

let {
  class: className,
  checked = $bindable(false),
  indeterminate = $bindable(false),
  ...rest
}: Props = $props()
</script>

<CheckboxPrimitive.Root
  bind:checked
  bind:indeterminate
  class={cn(checkboxVariants(), className)}
  {...rest}
>
  {#snippet children({ checked, indeterminate })}
    <div class={checkboxIndicatorVariants()} data-indicator="">
      {#if indeterminate}
        <MinusMini class="size-[15px]" />
      {:else if checked}
        <CheckMini class="size-[15px]" />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>
