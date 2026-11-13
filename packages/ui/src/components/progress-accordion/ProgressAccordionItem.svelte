<script lang="ts">
import { Accordion as AccordionPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { progressAccordionItemVariants } from "./variants"

type Props = AccordionPrimitive.ItemProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<AccordionPrimitive.Item class={cn(progressAccordionItemVariants(), className)} {...rest}>
  {@render children?.()}
</AccordionPrimitive.Item>
