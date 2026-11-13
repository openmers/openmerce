<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { dropdownMenuShortcutVariants } from "./variants"

type Props = HTMLAttributes<HTMLSpanElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<span class={cn(dropdownMenuShortcutVariants(), className)} {...rest}>{@render children?.()}</span>
