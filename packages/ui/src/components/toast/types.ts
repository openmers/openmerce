export type ToastVariant = "info" | "success" | "warning" | "error" | "loading"

export type ToastActionProps = {
  label: string
  onClick: (event: MouseEvent) => void
  variant?: "default" | "destructive"
}
