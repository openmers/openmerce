<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type LabelVariants, labelVariants } from "./variants"

type Props = HTMLAttributes<HTMLLabelElement> &
  LabelVariants & {
    children?: Snippet
  }

let { class: className, size = "base", weight = "regular", children, ...rest }: Props = $props()
</script>

<label class={cn(labelVariants({ size, weight }), className)} {...rest}>
  {@render children?.()}
</label>
