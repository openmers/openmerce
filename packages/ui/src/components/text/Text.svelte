<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type TextVariants, textVariants } from "./variants"

type Props = HTMLAttributes<HTMLElement> &
  TextVariants & {
    as?: "p" | "span" | "div"
    children?: Snippet
  }

let {
  class: className,
  as = "p",
  size = "base",
  weight = "regular",
  family = "sans",
  leading = "normal",
  children,
  ...rest
}: Props = $props()
</script>

<svelte:element
  this={as}
  class={cn(textVariants({ size, weight, family, leading }), className)}
  {...rest}
>
  {@render children?.()}
</svelte:element>
