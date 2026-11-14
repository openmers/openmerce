import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"

export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    <table className={cn("txt-compact-small w-full text-muted-foreground", className)} {...rest} />
  )
}

export function TableRow({ className, ...rest }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border bg-card transition-fg hover:bg-accent",
        "[&_td:last-child]:pr-6 [&_th:last-child]:pr-6",
        "[&_td:first-child]:pl-6 [&_th:first-child]:pl-6",
        className,
      )}
      {...rest}
    />
  )
}

export function TableCell({ className, ...rest }: ComponentProps<"td">) {
  return <td className={cn("h-12 py-0 pl-0 pr-6", className)} {...rest} />
}

export function TableHeader({ className, ...rest }: ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "txt-compact-small-plus border-y border-border [&_tr]:bg-background [&_tr]:hover:bg-background",
        className,
      )}
      {...rest}
    />
  )
}

export function TableHeaderCell({ className, ...rest }: ComponentProps<"th">) {
  return (
    <th
      className={cn("txt-compact-small-plus h-12 py-0 pl-0 pr-6 text-left", className)}
      {...rest}
    />
  )
}

export function TableBody({ className, ...rest }: ComponentProps<"tbody">) {
  return <tbody className={cn("border-b border-border", className)} {...rest} />
}
