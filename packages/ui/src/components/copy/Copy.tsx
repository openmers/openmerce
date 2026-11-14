import { CircleCheck, Copy as CopyIcon } from "lucide-react"
import { type ComponentProps, type MouseEvent, useEffect, useState } from "react"
import { cn } from "../../utils/cn"

type Props = ComponentProps<"button"> & {
  content: string
  variant?: "mini" | "default" | null
}

export function Copy({ children, className, content, variant = "default", ...rest }: Props) {
  const [done, setDone] = useState(false)
  const text = done ? "Copied" : "Copy"
  const iconClass = cn("text-muted-foreground", variant === "default" ? "size-4" : "size-3.5")

  useEffect(() => {
    if (!done) {
      return
    }
    const reset = setTimeout(() => setDone(false), 2000)
    return () => clearTimeout(reset)
  }, [done])

  function copyToClipboard(event: MouseEvent) {
    event.stopPropagation()
    setDone(true)
    navigator.clipboard?.writeText(content).catch(() => {})
  }

  return (
    <button
      aria-label="Copy code snippet"
      title={text}
      type="button"
      className={cn("h-fit w-fit", className)}
      onClick={copyToClipboard}
      {...rest}
    >
      {children ??
        (done ? <CircleCheck className={iconClass} /> : <CopyIcon className={iconClass} />)}
    </button>
  )
}
