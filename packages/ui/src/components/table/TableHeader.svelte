<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLTableSectionElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<thead
  class={cn(
    "txt-compact-small-plus border-y border-border [&_tr]:bg-background [&_tr]:hover:bg-background",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</thead>
