<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import { dropdownMenuSeparatorVariants } from "./variants"

type Props = DropdownMenuPrimitive.SeparatorProps

let { class: className, ...rest }: Props = $props()
</script>

<DropdownMenuPrimitive.Separator class={cn(dropdownMenuSeparatorVariants(), className)} {...rest} />
