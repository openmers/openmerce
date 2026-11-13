<script lang="ts">
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { commandBarCommandVariants, commandBarKbdVariants } from "./variants"

type Props = Omit<HTMLButtonAttributes, "onclick"> & {
  action: () => void | Promise<void>
  label: string
  shortcut: string
}

let {
  class: className,
  type = "button",
  label,
  action,
  shortcut,
  disabled,
  ...rest
}: Props = $props()

function isInputElement(element: Element | null) {
  if (!element) return false
  const tag = element.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.hasAttribute("contenteditable")
  )
}

function handleKeyDown(event: KeyboardEvent) {
  if (isInputElement(document.activeElement)) return
  if (event.key.toLowerCase() === shortcut.toLowerCase()) {
    event.preventDefault()
    event.stopPropagation()
    action()
  }
}

$effect(() => {
  if (disabled) return
  document.addEventListener("keydown", handleKeyDown)
  return () => document.removeEventListener("keydown", handleKeyDown)
})
</script>

<button
  class={cn(commandBarCommandVariants(), className)}
  {type}
  onclick={action}
  {disabled}
  {...rest}
>
  <span>{label}</span>
  <kbd class={cn(commandBarKbdVariants())}>{shortcut.toUpperCase()}</kbd>
</button>
