<script lang="ts">
import type { HTMLInputAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { Text } from "../text"
import { type CurrencyInputVariants, currencyInputVariants } from "./variants"

type Props = Omit<HTMLInputAttributes, "size" | "prefix" | "suffix"> &
  CurrencyInputVariants & {
    symbol: string
    code: string
  }

let {
  size = "base",
  symbol,
  code,
  disabled,
  "aria-invalid": ariaInvalid,
  oninvalid,
  class: className,
  ...rest
}: Props = $props()

let innerRef: HTMLInputElement
let valid = $state(true)

function handleInvalid(event: Event & { currentTarget: HTMLInputElement }) {
  valid = event.currentTarget.validity.valid
  oninvalid?.(event)
}
</script>

<div
  onclick={() => {
    innerRef?.focus()
  }}
  class={cn(
    "w-full cursor-text justify-between overflow-hidden",
    currencyInputVariants({ size }),
    {
      "text-fg-disabled !bg-muted !shadow-buttons-neutral !placeholder-fg-disabled cursor-not-allowed":
        disabled,
      "!shadow-borders-error invalid:!shadow-borders-error": ariaInvalid || !valid,
    },
    className,
  )}
>
  <span
    class={cn("w-fit min-w-[32px] border-r px-2", {
      "py-[9px]": size === "base",
      "py-[5px]": size === "small",
    })}
    role="presentation"
  >
    <Text
      size="small"
      leading="compact"
      class={cn("text-fg-muted pointer-events-none select-none uppercase", {
        "text-fg-disabled": disabled,
      })}
    >
      {code}
    </Text>
  </span>
  <input
    class="h-full min-w-0 flex-1 appearance-none bg-transparent text-right outline-hidden disabled:cursor-not-allowed"
    {disabled}
    oninvalid={handleInvalid}
    bind:this={innerRef}
    {...rest}
  />
  <span
    class={cn(
      "flex w-fit min-w-[32px] items-center justify-center border-l px-2 text-right",
      {
        "py-[9px]": size === "base",
        "py-[5px]": size === "small",
      },
    )}
    role="presentation"
  >
    <Text
      size="small"
      leading="compact"
      class={cn("text-fg-muted pointer-events-none select-none", {
        "text-fg-disabled": disabled,
      })}
    >
      {symbol}
    </Text>
  </span>
</div>
