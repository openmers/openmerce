<script lang="ts">
import { Switch as SwitchPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import { type SwitchVariants, switchThumbVariants, switchVariants } from "./variants"

type Props = SwitchPrimitive.RootProps & SwitchVariants

let { class: className, size = "base", checked = $bindable(false), ...rest }: Props = $props()
</script>

<SwitchPrimitive.Root
  bind:checked
  class={cn(switchVariants({ size }), className)}
  {...rest}
>
  <SwitchPrimitive.Thumb class={cn(switchThumbVariants({ size }))} />
</SwitchPrimitive.Root>
