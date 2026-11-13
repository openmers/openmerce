<script lang="ts">
import CircleCheck from "@lucide/svelte/icons/circle-check"
import CircleExclamationPoint from "@lucide/svelte/icons/circle-exclamation-point"
import CircleX from "@lucide/svelte/icons/circle-x"
import Info from "@lucide/svelte/icons/info"
import X from "@lucide/svelte/icons/x"
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { IconButton } from "../icon-button"
import { alertIconVariants } from "./variants"

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: "error" | "success" | "warning" | "info"
  dismissible?: boolean
  children?: Snippet
}

let { variant = "info", dismissible = false, class: className, children, ...rest }: Props = $props()

let dismissed = $state(false)

const icons = {
  info: Info,
  error: CircleX,
  success: CircleCheck,
  warning: CircleExclamationPoint,
}

let Icon = $derived(icons[variant])
</script>

{#if !dismissed}
  <div
    class={cn(
      "txt-compact-small grid items-start gap-x-2 text-pretty rounded-lg border bg-background p-3",
      dismissible ? "grid-cols-[20px_1fr_20px]" : "grid-cols-[20px_1fr]",
      className,
    )}
    {...rest}
  >
    <Icon class={alertIconVariants({ variant })} aria-hidden="true" />
    <div class="w-full">
      {@render children?.()}
    </div>
    {#if dismissible}
      <IconButton
        size="2xsmall"
        variant="transparent"
        type="button"
        aria-label="Dismiss"
        onclick={() => {
          dismissed = true
        }}
      >
        <X class="text-fg-muted" aria-hidden="true" />
      </IconButton>
    {/if}
  </div>
{/if}
