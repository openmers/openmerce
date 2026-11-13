<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = DialogPrimitive.TriggerProps & {
  children?: Snippet
}

let { children, ...rest }: Props = $props()
</script>

<DialogPrimitive.Trigger {...rest}>
  {@render children?.()}
</DialogPrimitive.Trigger>
