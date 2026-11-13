<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLDivElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div
  class={cn("w-full rounded-lg bg-card px-6 py-4 shadow-elevation-card-rest", className)}
  {...rest}
>
  {@render children?.()}
</div>
