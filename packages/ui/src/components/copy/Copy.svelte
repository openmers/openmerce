<script lang="ts">
import CircleCheck from "@lucide/svelte/icons/circle-check"
import CopyIcon from "@lucide/svelte/icons/copy"
import type { Snippet } from "svelte"
import type { HTMLButtonAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"

type Props = HTMLButtonAttributes & {
  content: string
  variant?: "mini" | "default" | null
  children?: Snippet
}

let { children, class: className, content, variant = "default", ...rest }: Props = $props()

let done = $state(false)
const text = $derived(done ? "Copied" : "Copy")
const isDefault = $derived(variant === "default")

$effect(() => {
  if (!done) {
    return
  }
  const reset = setTimeout(() => {
    done = false
  }, 2000)
  return () => clearTimeout(reset)
})

function copyToClipboard(event: MouseEvent) {
  event.stopPropagation()
  done = true
  navigator.clipboard?.writeText(content).catch(() => {})
}
</script>

<button
  aria-label="Copy code snippet"
  title={text}
  type="button"
  class={cn("h-fit w-fit", className)}
  onclick={copyToClipboard}
  {...rest}
>
  {#if children}
    {@render children()}
  {:else if done}
    <CircleCheck class={cn("text-muted-foreground", isDefault ? "size-4" : "size-3.5")} />
  {:else}
    <CopyIcon class={cn("text-muted-foreground", isDefault ? "size-4" : "size-3.5")} />
  {/if}
</button>
