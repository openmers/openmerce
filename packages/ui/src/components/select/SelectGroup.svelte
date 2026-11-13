<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = SelectPrimitive.GroupProps & {
  children?: Snippet
}

let { children, ...rest }: Props = $props()
</script>

<SelectPrimitive.Group {...rest}>
  {@render children?.()}
</SelectPrimitive.Group>
