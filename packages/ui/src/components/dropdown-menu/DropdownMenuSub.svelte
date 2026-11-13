<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = DropdownMenuPrimitive.SubProps & {
  children?: Snippet
}

let { open = $bindable(false), children, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.Sub bind:open {...rest}>
  {@render children?.()}
</DropdownMenuPrimitive.Sub>
