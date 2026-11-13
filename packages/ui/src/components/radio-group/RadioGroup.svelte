<script lang="ts">
import { RadioGroup as RadioGroupPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import { cn } from "../../utils/cn"
import { radioGroupVariants } from "./variants"

type Props = RadioGroupPrimitive.RootProps & {
  children?: Snippet
}

let { class: className, value = $bindable(""), children, ...rest }: Props = $props()
</script>

<RadioGroupPrimitive.Root bind:value class={cn(radioGroupVariants(), className)} {...rest}>
  {@render children?.()}
</RadioGroupPrimitive.Root>
