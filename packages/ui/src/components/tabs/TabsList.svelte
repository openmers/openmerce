<script lang="ts">
import { Tabs as TabsPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { tabsListVariants } from "./variants"

type Props = TabsPrimitive.ListProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<TabsPrimitive.List class={cn(tabsListVariants(), className)} {...rest}>
  {@render children?.()}
</TabsPrimitive.List>
