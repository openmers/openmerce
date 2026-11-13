<script lang="ts">
import type { HTMLTextareaAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { inputBaseStyles } from "../input/variants"

type Props = HTMLTextareaAttributes

let { class: className, ...rest }: Props = $props()
</script>

<textarea
  class={cn(inputBaseStyles, "txt-small min-h-[60px] w-full px-2 py-1.5", className)}
  {...rest}
/>
