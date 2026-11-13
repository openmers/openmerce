<script lang="ts">
import LoaderCircle from "@lucide/svelte/icons/loader-circle"
import type { Snippet } from "svelte"
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type IconButtonVariants, iconButtonVariants } from "./variants"

type Props = HTMLButtonAttributes &
  IconButtonVariants & {
    isLoading?: boolean
    children?: Snippet
  }

let {
  variant,
  size,
  class: className,
  isLoading = false,
  disabled,
  children,
  ...rest
}: Props = $props()
</script>

<button
  {...rest}
  class={cn(iconButtonVariants({ variant, size }), className)}
  disabled={disabled || isLoading}
  aria-busy={isLoading ? "true" : undefined}
>
  {#if isLoading}
    <span class="pointer-events-none">
      <div class="absolute inset-0 flex items-center justify-center rounded-md bg-muted">
        <LoaderCircle class="animate-spin" aria-hidden="true" />
      </div>
      {@render children?.()}
    </span>
  {:else}
    {@render children?.()}
  {/if}
</button>
