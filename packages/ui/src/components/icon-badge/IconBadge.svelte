<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type BadgeColorVariants, badgeColorVariants } from "../badge/variants"
import { type IconBadgeVariants, iconBadgeVariants } from "./variants"

type Props = Omit<HTMLAttributes<HTMLSpanElement>, "color"> &
  BadgeColorVariants &
  IconBadgeVariants & {
    children?: Snippet
  }

let { children, class: className, color = "grey", size = "base", ...rest }: Props = $props()
</script>

<span
  class={cn(badgeColorVariants({ color }), iconBadgeVariants({ size }), className)}
  {...rest}
>
  {@render children?.()}
</span>
