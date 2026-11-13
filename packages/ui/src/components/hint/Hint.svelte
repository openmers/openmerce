<script lang="ts">
import CircleExclamationPoint from "@lucide/svelte/icons/circle-exclamation-point"
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type HintVariants, hintVariants } from "./variants"

type Props = HTMLAttributes<HTMLSpanElement> &
  HintVariants & {
    children?: Snippet
  }

let { class: className, variant = "info", children, ...rest }: Props = $props()
</script>

<span class={cn(hintVariants({ variant }), className)} {...rest}>
  {#if variant === "error"}
    <div class="size-5 flex items-center justify-center">
      <CircleExclamationPoint class="size-5" aria-hidden="true" />
    </div>
  {/if}
  {@render children?.()}
</span>
