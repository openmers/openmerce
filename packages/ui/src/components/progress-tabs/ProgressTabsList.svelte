<script lang="ts">
import { Tabs as TabsPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { progressTabsListVariants } from "./variants"

type Props = TabsPrimitive.ListProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<TabsPrimitive.List class={cn(progressTabsListVariants(), className)} {...rest}>
  {@render children?.()}
</TabsPrimitive.List>
