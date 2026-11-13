<script lang="ts">
import { PinInput as PinInputPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import {
  otpCellVariants,
  otpGroupVariants,
  otpInputVariants,
  otpSeparatorVariants,
} from "./variants"

type Props = HTMLAttributes<HTMLDivElement> & {
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  groupSize?: number
  separator?: Snippet | string
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  inputClassName?: string
  "aria-invalid"?: boolean | "true" | "false"
}

let {
  value = $bindable(""),
  onChange,
  onComplete,
  length = 6,
  groupSize = 3,
  separator = "-",
  disabled = false,
  readOnly = false,
  autoFocus = false,
  inputClassName,
  class: className,
  "aria-label": ariaLabel = "One-time password",
  "aria-invalid": ariaInvalid,
  ...rest
}: Props = $props()

const codeLength = $derived(Math.max(1, length))
const safeGroupSize = $derived(Math.max(1, groupSize))

let inputRef = $state<HTMLInputElement | null>(null)

$effect(() => {
  if (autoFocus) inputRef?.focus()
})
</script>

<PinInputPrimitive.Root
  bind:value
  maxlength={codeLength}
  pattern="[0-9]*"
  pushPasswordManagerStrategy="none"
  inputmode="numeric"
  autocomplete="one-time-code"
  {disabled}
  aria-readonly={readOnly || undefined}
  onValueChange={(next) => {
    if (next.length === codeLength) onComplete?.(next)
    onChange?.(next)
  }}
  class={cn(otpInputVariants(), className)}
  aria-label={ariaLabel}
  aria-invalid={ariaInvalid}
  bind:inputRef
  {...rest}
>
  {#snippet children({ cells })}
    {#each Array.from({ length: Math.ceil(codeLength / safeGroupSize) }) as _, groupIndex}
      {#if groupIndex > 0}
        {#if separator}
          <span class={cn(otpSeparatorVariants())} aria-hidden="true">
            {#if typeof separator === "string"}
              {separator}
            {:else}
              {@render separator()}
            {/if}
          </span>
        {/if}
      {/if}
      <div class={cn(otpGroupVariants())}>
        {#each cells.slice(groupIndex * safeGroupSize, (groupIndex + 1) * safeGroupSize) as cell}
          <PinInputPrimitive.Cell
            {cell}
            class={cn(otpCellVariants(), inputClassName)}
            data-active={cell.isActive ? "" : undefined}
            data-disabled={disabled ? "" : undefined}
          >
            <span aria-hidden="true">{cell.char ?? ""}</span>
          </PinInputPrimitive.Cell>
        {/each}
      </div>
    {/each}
  {/snippet}
</PinInputPrimitive.Root>
