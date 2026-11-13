<script lang="ts">
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { selectSeparatorVariants } from "./variants"

// bits-ui v2 `Select` ayırıcı bileşeni yayınlamaz; Radix'teki gibi bağımsız bir div.
type Props = HTMLAttributes<HTMLDivElement>

let { class: className, ...rest }: Props = $props()
</script>

<div class={cn(selectSeparatorVariants(), className)} {...rest}></div>
