<script lang="ts">
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { selectSeparatorVariants } from "./variants"

// bits-ui v2 `Select` does not ship a separator component; this is a standalone div, as in Radix.
type Props = HTMLAttributes<HTMLDivElement>

let { class: className, ...rest }: Props = $props()
</script>

<div class={cn(selectSeparatorVariants(), className)} {...rest}></div>
