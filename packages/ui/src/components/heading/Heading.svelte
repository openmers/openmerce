<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type HeadingVariants, headingVariants } from "./variants"

type Props = HTMLAttributes<HTMLHeadingElement> &
  HeadingVariants & {
    children?: Snippet
  }

let { level = "h1", class: className, children, ...rest }: Props = $props()
</script>

<svelte:element this={level} class={cn(headingVariants({ level }), className)} {...rest}>
  {@render children?.()}
</svelte:element>
