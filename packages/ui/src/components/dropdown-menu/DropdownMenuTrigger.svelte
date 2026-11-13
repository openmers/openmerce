<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = DropdownMenuPrimitive.TriggerProps & {
  children?: Snippet
}

let { children, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.Trigger {...rest}>
  {@render children?.()}
</DropdownMenuPrimitive.Trigger>
