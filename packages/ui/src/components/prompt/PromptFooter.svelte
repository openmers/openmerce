<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { promptFooterVariants } from "./variants"

type Props = HTMLAttributes<HTMLDivElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div class={cn(promptFooterVariants(), className)} {...rest}>
  {@render children?.()}
</div>
