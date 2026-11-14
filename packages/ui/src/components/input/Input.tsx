import { Eye, EyeOff, Search } from "lucide-react"
import { type ComponentProps, useState } from "react"
import { cn } from "../../utils/cn"
import { type InputVariants, inputVariants } from "./variants"

type Props = Omit<ComponentProps<"input">, "size"> & InputVariants

export function Input({ className, type, size = "base", ...rest }: Props) {
  const [toggledType, setToggledType] = useState<"text" | "password" | null>(null)
  const typeState = toggledType ?? type
  const isPassword = type === "password"
  const isSearch = type === "search"
  const iconBox = { "h-8 w-8": size === "base", "h-7 w-7": size === "small" }

  return (
    <div className="relative">
      <input
        type={isPassword ? typeState : type}
        className={cn(
          inputVariants({ size }),
          {
            "pl-8": isSearch && size === "base",
            "pr-8": isPassword && size === "base",
            "pl-7": isSearch && size === "small",
            "pr-7": isPassword && size === "small",
          },
          className,
        )}
        {...rest}
      />
      {isSearch && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 left-0 flex items-center justify-center text-fg-muted",
            iconBox,
          )}
          role="img"
        >
          <Search aria-hidden="true" />
        </div>
      )}
      {isPassword && (
        <div
          className={cn(
            "absolute bottom-0 right-0 flex items-center justify-center border-l",
            iconBox,
          )}
        >
          <button
            className="h-fit w-fit rounded-xs text-fg-muted outline-hidden transition-all hover:text-foreground focus-visible:text-foreground active:text-foreground"
            type="button"
            onClick={() => setToggledType(typeState === "password" ? "text" : "password")}
          >
            <span className="sr-only">
              {typeState === "password" ? "Show password" : "Hide password"}
            </span>
            {typeState === "password" ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          </button>
        </div>
      )}
    </div>
  )
}
