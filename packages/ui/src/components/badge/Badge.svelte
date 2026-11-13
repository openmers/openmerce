<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import {
  type BadgeColorVariants,
  type BadgeSizeVariants,
  badgeColorVariants,
  badgeSizeVariants,
} from "./variants"

type Props = HTMLAttributes<HTMLSpanElement> &
  BadgeColorVariants &
  BadgeSizeVariants & {
    children?: Snippet
  }

let { size, rounded, color, class: className, children, ...rest }: Props = $props()
</script>

<span
  class={cn(badgeColorVariants({ color }), badgeSizeVariants({ size, rounded }), className)}
  {...rest}
>
  {@render children?.()}
</span>
