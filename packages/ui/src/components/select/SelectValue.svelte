<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui"
import type { Snippet } from "svelte"

type Props = SelectPrimitive.ValueProps & {
  /** bits-ui `Value` alt içerik verilirse yer tutucuyu kendi çizer; boş dilim göndermeyiz. */
  placeholder?: string
  children?: Snippet
}

let { children, placeholder, ...rest }: Props = $props()
</script>

{#if children}
  <SelectPrimitive.Value {...rest} {placeholder}>
    {@render children()}
  </SelectPrimitive.Value>
{:else}
  <SelectPrimitive.Value {...rest} {placeholder} />
{/if}
