<script lang="ts">
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { commandBarSeparatorVariants } from "./variants"

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children">

let { class: className, ...rest }: Props = $props()
</script>

<div class={cn(commandBarSeparatorVariants(), className)} {...rest}></div>
