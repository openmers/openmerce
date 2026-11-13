<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { promptDescriptionVariants } from "./variants"

type Props = AlertDialogPrimitive.DescriptionProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<AlertDialogPrimitive.Description class={cn(promptDescriptionVariants(), className)} {...rest}>
  {@render children?.()}
</AlertDialogPrimitive.Description>
