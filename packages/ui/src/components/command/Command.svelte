<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { commandVariants } from "./variants"

// The kit's `Command.Copy` subcomponent maps to the B1 `Copy` component; only the body lives here.
type Props = HTMLAttributes<HTMLDivElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div class={cn(commandVariants(), className)} {...rest}>
  {@render children?.()}
</div>
