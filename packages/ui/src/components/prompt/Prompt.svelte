<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { type PromptVariant, setPromptVariant } from "./context"

type Props = AlertDialogPrimitive.RootProps & {
  variant?: PromptVariant
  children?: Snippet
}

let { variant = "danger", open = $bindable(false), children, ...rest }: Props = $props()

setPromptVariant(() => variant)
</script>

<AlertDialogPrimitive.Root bind:open {...rest}>
  {@render children?.()}
</AlertDialogPrimitive.Root>
