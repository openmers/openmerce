<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import type { HTMLButtonAttributes } from "svelte/elements"
import Button from "../button/Button.svelte"

type Props = AlertDialogPrimitive.CancelProps & {
  children?: Snippet
}

let { children, ...rest }: Props = $props()
</script>

<AlertDialogPrimitive.Cancel {...rest}>
  {#snippet child({ props })}
    <Button {...(props as HTMLButtonAttributes)} size="small" variant="secondary">
      {@render children?.()}
    </Button>
  {/snippet}
</AlertDialogPrimitive.Cancel>
