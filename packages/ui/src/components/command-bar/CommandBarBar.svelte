<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { commandBarBarVariants } from "./variants"

type Props = HTMLAttributes<HTMLDivElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div class={cn(commandBarBarVariants(), className)} {...rest}>
  {@render children?.()}
</div>
