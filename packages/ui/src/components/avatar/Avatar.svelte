<script lang="ts">
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type AvatarVariants, avatarInnerVariants, avatarVariants } from "./variants"

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children"> &
  AvatarVariants & {
    src?: string
    fallback: string
  }

let {
  src,
  fallback,
  variant = "rounded",
  size = "base",
  class: className,
  ...rest
}: Props = $props()

let failedSrc = $state<string | null>(null)
</script>

<div class={cn(avatarVariants({ variant, size }), className)} {...rest}>
  {#if src && failedSrc !== src}
    <img
      {src}
      alt=""
      class={avatarInnerVariants({ variant, size })}
      onerror={() => {
        failedSrc = src ?? null
      }}
    />
  {:else}
    <span
      class={cn(
        avatarInnerVariants({ variant, size }),
        "bg-bg-component-hover text-muted-foreground pointer-events-none flex select-none items-center justify-center",
      )}
    >
      {fallback}
    </span>
  {/if}
</div>
