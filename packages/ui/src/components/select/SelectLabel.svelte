<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { selectLabelVariants } from "./variants"

type Props = SelectPrimitive.GroupHeadingProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<SelectPrimitive.GroupHeading class={cn(selectLabelVariants(), className)} {...rest}>
  {@render children?.()}
</SelectPrimitive.GroupHeading>
