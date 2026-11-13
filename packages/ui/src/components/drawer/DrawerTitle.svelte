<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = DialogPrimitive.TitleProps & {
  children?: Snippet
}

let { children, ...rest }: Props = $props()
</script>

<DialogPrimitive.Title {...rest}>
  {@render children?.()}
</DialogPrimitive.Title>
