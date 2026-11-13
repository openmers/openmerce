<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { inlineTipBarVariants } from "./variants"

type Props = HTMLAttributes<HTMLDivElement> & {
  label: string
  variant?: "info" | "warning" | "error" | "success"
  children?: Snippet
}

let { variant = "info", label, class: className, children, ...rest }: Props = $props()
</script>

<div
  class={cn(
    "bg-popover txt-small text-muted-foreground grid grid-cols-[4px_1fr] items-start gap-3 rounded-lg border p-3",
    className,
  )}
  {...rest}
>
  <div role="presentation" class={inlineTipBarVariants({ variant })} />
  <div class="text-pretty">
    <strong class="txt-small-plus text-foreground">{label}:</strong>
    {" "}
    {@render children?.()}
  </div>
</div>
