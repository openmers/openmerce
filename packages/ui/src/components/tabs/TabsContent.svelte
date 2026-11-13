<script lang="ts">
import { Tabs as TabsPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { tabsContentVariants } from "./variants"

type Props = TabsPrimitive.ContentProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<TabsPrimitive.Content class={cn(tabsContentVariants(), className)} {...rest}>
  {@render children?.()}
</TabsPrimitive.Content>
