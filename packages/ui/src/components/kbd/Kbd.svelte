<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<kbd
  class={cn(
    "inline-flex h-5 w-fit min-w-[20px] items-center justify-center rounded-md border border-tag-neutral-border bg-tag-neutral-bg px-1 text-tag-neutral-text",
    "txt-compact-xsmall-plus",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</kbd>
