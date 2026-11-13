<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"

type Props = DialogPrimitive.DescriptionProps & {
  children?: Snippet
}

let { class: className, children, ...rest }: Props = $props()
</script>

// the kit default `Text` (size=base) is `txt-small`.
<DialogPrimitive.Description class={cn("txt-small", className)} {...rest}>
  {@render children?.()}
</DialogPrimitive.Description>
