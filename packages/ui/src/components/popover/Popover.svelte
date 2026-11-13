<script lang="ts">
import { Popover as PopoverPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = PopoverPrimitive.RootProps & {
  children?: Snippet
}

let { open = $bindable(false), children, ...rest }: Props = $props()
</script>

<PopoverPrimitive.Root bind:open {...rest}>
  {@render children?.()}
</PopoverPrimitive.Root>
