<script lang="ts">
import { Accordion as AccordionPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = AccordionPrimitive.RootProps & {
  children?: Snippet
}

let { value = $bindable(""), children, ...rest }: Props = $props()
</script>

<AccordionPrimitive.Root bind:value {...rest}>
  {@render children?.()}
</AccordionPrimitive.Root>
