<script lang="ts">
import { Tabs as TabsPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import ProgressTabsIndicator from "./ProgressTabsIndicator.svelte"
import { type ProgressStatus, progressTabsTriggerVariants } from "./variants"

type Props = TabsPrimitive.TriggerProps & {
  status?: ProgressStatus
  children?: Snippet
}

let { class: className, status = "not-started", children, ...rest }: Props = $props()
</script>

<TabsPrimitive.Trigger class={cn(progressTabsTriggerVariants(), className)} {...rest}>
  <ProgressTabsIndicator {status} />
  {@render children?.()}
</TabsPrimitive.Trigger>
