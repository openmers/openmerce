<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLTableCellElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<td class={cn("h-12 py-0 pl-0 pr-6", className)} {...rest}>
  {@render children?.()}
</td>
