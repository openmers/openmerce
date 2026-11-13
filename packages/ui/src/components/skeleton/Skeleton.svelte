<script lang="ts">
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLAttributes<HTMLDivElement>

let { class: className, ...rest }: Props = $props()
</script>

<div class={cn("animate-pulse rounded-md bg-popover", className)} {...rest} />
