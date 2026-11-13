<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = DropdownMenuPrimitive.RadioGroupProps & {
  children?: Snippet
}

let { value = $bindable(""), children, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.RadioGroup bind:value {...rest}>
  {@render children?.()}
</DropdownMenuPrimitive.RadioGroup>
