<script lang="ts">
import { Tabs as TabsPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"

type Props = TabsPrimitive.RootProps & {
  children?: Snippet
}

let { class: className, value = $bindable(""), children, ...rest }: Props = $props()
</script>

<TabsPrimitive.Root bind:value class={cn(className)} {...rest}>
  {@render children?.()}
</TabsPrimitive.Root>
