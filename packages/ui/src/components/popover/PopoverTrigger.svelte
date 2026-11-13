<script lang="ts">
import { Popover as PopoverPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"

type Props = PopoverPrimitive.TriggerProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<PopoverPrimitive.Trigger class={cn(className)} {...rest}>
  {@render children?.()}
</PopoverPrimitive.Trigger>
