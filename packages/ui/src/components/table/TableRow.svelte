<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLTableRowElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<tr
  class={cn(
    "border-b border-border bg-card transition-fg hover:bg-accent",
    "[&_td:last-child]:pr-6 [&_th:last-child]:pr-6",
    "[&_td:first-child]:pl-6 [&_th:first-child]:pl-6",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</tr>
