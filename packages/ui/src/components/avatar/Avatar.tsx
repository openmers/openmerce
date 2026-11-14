import { type ComponentProps, useState } from "react"
import { cn } from "../../utils/cn"
import { type AvatarVariants, avatarInnerVariants, avatarVariants } from "./variants"

type Props = Omit<ComponentProps<"div">, "children"> &
  AvatarVariants & {
    src?: string
    fallback: string
  }

export function Avatar({
  src,
  fallback,
  variant = "rounded",
  size = "base",
  className,
  ...rest
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  return (
    <div className={cn(avatarVariants({ variant, size }), className)} {...rest}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt=""
          className={avatarInnerVariants({ variant, size })}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span
          className={cn(
            avatarInnerVariants({ variant, size }),
            "bg-bg-component-hover text-muted-foreground pointer-events-none flex select-none items-center justify-center",
          )}
        >
          {fallback}
        </span>
      )}
    </div>
  )
}
