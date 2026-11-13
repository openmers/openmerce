<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = DropdownMenuPrimitive.RootProps & {
  children?: Snippet
}

let { open = $bindable(false), children, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.Root bind:open {...rest}>
  {@render children?.()}
</DropdownMenuPrimitive.Root>
