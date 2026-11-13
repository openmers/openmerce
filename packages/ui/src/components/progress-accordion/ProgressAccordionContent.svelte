<script lang="ts">
import { Accordion as AccordionPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { progressAccordionContentVariants } from "./variants"

type Props = AccordionPrimitive.ContentProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<AccordionPrimitive.Content class={cn(progressAccordionContentVariants(), className)} {...rest}>
  {@render children?.()}
</AccordionPrimitive.Content>
