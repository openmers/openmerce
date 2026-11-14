import { type ComponentProps, Fragment, type ReactNode, useEffect, useRef, useState } from "react"
import { cn } from "../../utils/cn"
import {
  otpCellVariants,
  otpGroupVariants,
  otpInputVariants,
  otpSeparatorVariants,
} from "./variants"

type OtpInputProps = Omit<ComponentProps<"div">, "onChange" | "defaultValue"> & {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  groupSize?: number
  separator?: ReactNode
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  inputClassName?: string
  "aria-invalid"?: boolean | "true" | "false"
}

/** A single transparent numeric input over painted cells, so paste and one-time-code autofill work natively. */
export function OtpInput({
  value: valueProp,
  defaultValue = "",
  onChange,
  onComplete,
  length = 6,
  groupSize = 3,
  separator = "-",
  disabled = false,
  readOnly = false,
  autoFocus = false,
  inputClassName,
  className,
  "aria-label": ariaLabel = "One-time password",
  "aria-invalid": ariaInvalid,
  ...rest
}: OtpInputProps) {
  const codeLength = Math.max(1, length)
  const safeGroupSize = Math.max(1, groupSize)
  const [internal, setInternal] = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const value = valueProp ?? internal

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  function handleChange(raw: string) {
    const next = raw.replace(/\D/g, "").slice(0, codeLength)
    if (next === value) return
    setInternal(next)
    onChange?.(next)
    if (next.length === codeLength) onComplete?.(next)
  }

  const activeIndex = focused ? Math.min(value.length, codeLength - 1) : -1
  const groups = Array.from({ length: Math.ceil(codeLength / safeGroupSize) }, (_, groupIndex) =>
    Array.from(
      { length: Math.min(safeGroupSize, codeLength - groupIndex * safeGroupSize) },
      (_, i) => groupIndex * safeGroupSize + i,
    ),
  )

  return (
    <div data-pin-input-root="" className={cn(otpInputVariants(), "relative", className)} {...rest}>
      {groups.map((group, groupIndex) => (
        <Fragment key={group[0]}>
          {groupIndex > 0 && separator && (
            <span className={otpSeparatorVariants()} aria-hidden="true">
              {separator}
            </span>
          )}
          <div className={otpGroupVariants()}>
            {group.map((index) => (
              <div
                key={index}
                data-pin-input-cell=""
                aria-invalid={ariaInvalid}
                className={cn(otpCellVariants(), inputClassName)}
                data-active={index === activeIndex ? "" : undefined}
                data-disabled={disabled ? "" : undefined}
              >
                <span aria-hidden="true">{value[index] ?? ""}</span>
              </div>
            ))}
          </div>
        </Fragment>
      ))}
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={codeLength}
        pattern="[0-9]*"
        inputMode="numeric"
        autoComplete="one-time-code"
        disabled={disabled}
        readOnly={readOnly}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-hidden disabled:cursor-not-allowed"
      />
    </div>
  )
}
