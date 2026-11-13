<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { type SelectSize, setSelectSize } from "./context"

type Props = SelectPrimitive.RootProps & {
  size?: SelectSize
  children?: Snippet
}

let { size = "base", children, ...rest }: Props = $props()

setSelectSize(() => size)
</script>

<SelectPrimitive.Root {...rest}>
  {@render children?.()}
</SelectPrimitive.Root>
