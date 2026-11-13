<script lang="ts">
import { Tabs as TabsPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { tabsTriggerVariants } from "./variants"

type Props = TabsPrimitive.TriggerProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<TabsPrimitive.Trigger class={cn(tabsTriggerVariants(), className)} {...rest}>
  {@render children?.()}
</TabsPrimitive.Trigger>
