<script lang="ts">
import WarningCircleSolid from "@lucide/svelte/icons/alert-circle"
import CheckCircleSolid from "@lucide/svelte/icons/circle-check"
import XCircleSolid from "@lucide/svelte/icons/circle-x"
import InformationCircleSolid from "@lucide/svelte/icons/info"
import Spinner from "@lucide/svelte/icons/loader-circle"
import XMark from "@lucide/svelte/icons/x"
import type { Snippet } from "svelte"
import { toast as sonnerToast } from "svelte-sonner"
import { cn } from "../../utils/cn"
import IconButton from "../icon-button/IconButton.svelte"
import type { ToastActionProps, ToastVariant } from "./types"
import {
  toastActionDestructiveVariants,
  toastActionVariants,
  toastDescriptionVariants,
  toastIconVariants,
  toastInnerVariants,
  toastTitleVariants,
  toastVariants,
} from "./variants"

type Props = {
  id: string | number
  variant?: ToastVariant
  title: string
  description?: string
  action?: ToastActionProps
  icon?: Snippet
  dismissable?: boolean
}

let { id, variant = "info", title, description, action, icon, dismissable = true }: Props = $props()
</script>

<div class={cn(toastVariants())} role="status" data-variant={variant}>
  <div
    class={cn(toastInnerVariants({ hasIcon: true, hasDescription: Boolean(description) }))}
  >
    <span class={cn(toastIconVariants())} aria-hidden="true">
      {#if icon}
        {@render icon()}
      {:else if variant === "success"}
        <CheckCircleSolid class="text-tag-green-icon" />
      {:else if variant === "warning"}
        <WarningCircleSolid class="text-tag-orange-icon" />
      {:else if variant === "error"}
        <XCircleSolid class="text-tag-red-icon" />
      {:else if variant === "loading"}
        <Spinner class="animate-spin text-tag-blue-icon" />
      {:else}
        <InformationCircleSolid class="text-foreground" />
      {/if}
    </span>
    <div class="flex flex-col gap-y-3">
      <div class="flex flex-col">
        <span class={cn(toastTitleVariants())}>{title}</span>
        {#if description}
          <span class={cn(toastDescriptionVariants())}>{description}</span>
        {/if}
      </div>
      {#if action}
        <button
          type="button"
          class={cn(
            toastActionVariants(),
            action.variant === "destructive" && toastActionDestructiveVariants(),
          )}
          onclick={action.onClick}
        >
          {action.label}
        </button>
      {/if}
    </div>
  </div>
  {#if dismissable}
    <IconButton
      size="2xsmall"
      variant="transparent"
      type="button"
      aria-label="Bildirimi kapat"
      onclick={() => sonnerToast.dismiss(id)}
    >
      <XMark />
    </IconButton>
  {/if}
</div>
