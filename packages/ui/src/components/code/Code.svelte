<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<code
  class={cn(
    "txt-compact-small inline-flex rounded-md border border-tag-neutral-border bg-tag-neutral-bg px-[6px] font-mono text-tag-neutral-text",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</code>
