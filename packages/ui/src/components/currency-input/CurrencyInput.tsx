import { type ComponentProps, type FormEvent, useRef, useState } from "react"
import { cn } from "../../utils/cn"
import { Text } from "../text"
import { type CurrencyInputVariants, currencyInputVariants } from "./variants"

type Props = Omit<ComponentProps<"input">, "size" | "prefix"> &
  CurrencyInputVariants & {
    symbol: string
    code: string
  }

export function CurrencyInput({
  size = "base",
  symbol,
  code,
  disabled,
  "aria-invalid": ariaInvalid,
  onInvalid,
  className,
  ...rest
}: Props) {
  const innerRef = useRef<HTMLInputElement>(null)
  const [valid, setValid] = useState(true)
  const padding = { "py-[9px]": size === "base", "py-[5px]": size === "small" }
  const textClass = { "text-fg-disabled": disabled }

  function handleInvalid(event: FormEvent<HTMLInputElement>) {
    setValid(event.currentTarget.validity.valid)
    onInvalid?.(event)
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the wrapper only forwards pointer focus; the input itself is keyboard reachable
    <div
      onClick={() => innerRef.current?.focus()}
      className={cn(
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
      <span className={cn("w-fit min-w-[32px] border-r px-2", padding)} role="presentation">
        <Text
          size="small"
          leading="compact"
          className={cn("text-fg-muted pointer-events-none select-none uppercase", textClass)}
        >
          {code}
        </Text>
      </span>
      <input
        className="h-full min-w-0 flex-1 appearance-none bg-transparent text-right outline-hidden disabled:cursor-not-allowed"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        onInvalid={handleInvalid}
        ref={innerRef}
        {...rest}
      />
      <span
        className={cn(
          "flex w-fit min-w-[32px] items-center justify-center border-l px-2 text-right",
          padding,
        )}
        role="presentation"
      >
        <Text
          size="small"
          leading="compact"
          className={cn("text-fg-muted pointer-events-none select-none", textClass)}
        >
          {symbol}
        </Text>
      </span>
    </div>
  )
}
