<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLTableSectionElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<tbody class={cn("border-b border-border", className)} {...rest}>
  {@render children?.()}
</tbody>
