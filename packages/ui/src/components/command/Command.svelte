<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { commandVariants } from "./variants"

// Medusa `Command.Copy` alt bileşeni B1 `Copy` bileşenine bağlı; burada yalnız gövde var.
type Props = HTMLAttributes<HTMLDivElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div class={cn(commandVariants(), className)} {...rest}>
  {@render children?.()}
</div>
