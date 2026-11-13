<script lang="ts">
import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down"
import { Select as SelectPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { getSelectSize } from "./context"
import { selectTriggerVariants } from "./variants"

type Props = SelectPrimitive.TriggerProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()

const getSize = getSelectSize()
const triggerClass = $derived(selectTriggerVariants({ size: getSize() }))
</script>

<SelectPrimitive.Trigger class={cn(triggerClass, className)} {...rest}>
  {@render children?.()}
  <ChevronsUpDown class="text-muted-foreground group-disabled/trigger:text-fg-disabled" />
</SelectPrimitive.Trigger>
