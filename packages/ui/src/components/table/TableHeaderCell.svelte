<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLTableCellElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<th class={cn("txt-compact-small-plus h-12 py-0 pl-0 pr-6 text-left", className)} {...rest}>
  {@render children?.()}
</th>
