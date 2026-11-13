<script lang="ts">
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { popoverSeparatorVariants } from "./variants"

type Props = HTMLAttributes<HTMLDivElement>

let { class: className, ...rest }: Props = $props()
</script>

<div class={cn(popoverSeparatorVariants(), className)} {...rest}></div>
