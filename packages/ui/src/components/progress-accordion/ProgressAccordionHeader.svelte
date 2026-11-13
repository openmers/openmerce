<script lang="ts">
import Plus from "@lucide/svelte/icons/plus"
import { Accordion as AccordionPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import IconButton from "../icon-button/IconButton.svelte"
import type { ProgressStatus } from "../progress-tabs/variants"
import ProgressAccordionIndicator from "./ProgressAccordionIndicator.svelte"
import { progressAccordionHeaderVariants } from "./variants"

type Props = AccordionPrimitive.HeaderProps & {
  status?: ProgressStatus
  children?: Snippet
}

let { class: className, status = "not-started", children, ...rest }: Props = $props()
</script>

<AccordionPrimitive.Header class={cn(progressAccordionHeaderVariants(), className)} {...rest}>
  <ProgressAccordionIndicator {status} />
  {@render children?.()}
  <AccordionPrimitive.Trigger class="ml-auto">
    {#snippet child({ props })}
      <IconButton {...(props as HTMLButtonAttributes)} variant="transparent">
        <Plus class="transform transition-transform group-data-[state=open]:rotate-45" />
      </IconButton>
    {/snippet}
  </AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
