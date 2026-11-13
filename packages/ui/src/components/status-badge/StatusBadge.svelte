<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type StatusBadgeVariants, statusBadgeVariants } from "./variants"

type Props = Omit<HTMLAttributes<HTMLSpanElement>, "color"> &
  StatusBadgeVariants & {
    children?: Snippet
  }

let { children, class: className, color = "grey", ...rest }: Props = $props()
</script>

<span
  class={cn(
    "txt-compact-xsmall-plus box-border flex w-fit select-none items-center overflow-hidden rounded-md border border-border bg-background pl-0 pr-1 leading-none text-muted-foreground",
    className,
  )}
  {...rest}
>
  <div role="presentation" class={statusBadgeVariants({ color })}>
    <div></div>
  </div>
  {@render children?.()}
</span>
