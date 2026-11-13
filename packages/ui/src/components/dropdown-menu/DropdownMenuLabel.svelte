<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { dropdownMenuLabelVariants } from "./variants"

// Radix `DropdownMenu.Label` bağımsız bir div'dir; bits-ui karşılığı `GroupHeading`
// yalnız `Group`/`RadioGroup` içinde çalıştığı için div olarak bırakıldı.
type Props = HTMLAttributes<HTMLDivElement> & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<div class={cn(dropdownMenuLabelVariants(), className)} {...rest}>
  {@render children?.()}
</div>
