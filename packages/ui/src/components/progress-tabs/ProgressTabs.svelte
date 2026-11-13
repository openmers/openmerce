<script lang="ts">
import { Tabs as TabsPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = TabsPrimitive.RootProps & {
  children?: Snippet
}

let { value = $bindable(""), activationMode = "automatic", children, ...rest }: Props = $props()
</script>

<TabsPrimitive.Root bind:value {activationMode} {...rest}>
  {@render children?.()}
</TabsPrimitive.Root>
