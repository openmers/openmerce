<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"

type Props = AlertDialogPrimitive.TitleProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

<AlertDialogPrimitive.Title class={cn("text-foreground h2-core", className)} {...rest}>
  {@render children?.()}
</AlertDialogPrimitive.Title>
