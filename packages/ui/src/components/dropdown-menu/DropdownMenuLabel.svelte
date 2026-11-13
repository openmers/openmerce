<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { dropdownMenuLabelVariants } from "./variants"

// Radix `DropdownMenu.Label` is a standalone div; the bits-ui counterpart `GroupHeading`
// only works inside `Group`/`RadioGroup`, so it was left as a div.
type Props = HTMLAttributes<HTMLDivElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div class={cn(dropdownMenuLabelVariants(), className)} {...rest}>
  {@render children?.()}
</div>
