<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLTableElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<table class={cn("txt-compact-small w-full text-muted-foreground", className)} {...rest}>
  {@render children?.()}
</table>
