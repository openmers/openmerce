import type { MouseEvent } from "react"

export type ToastVariant = "info" | "success" | "warning" | "error" | "loading"

export type ToastActionProps = {
  label: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  variant?: "default" | "destructive"
}
