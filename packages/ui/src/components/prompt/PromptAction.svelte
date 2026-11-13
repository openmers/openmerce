<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui"
import type { Snippet } from "svelte"
import type { HTMLButtonAttributes } from "svelte/elements"
import Button from "../button/Button.svelte"
import { getPromptVariant } from "./context"

type Props = AlertDialogPrimitive.ActionProps & {
  children?: Snippet
}

let { children, onclick, ...rest }: Props = $props()

const getVariant = getPromptVariant()
const buttonVariant = $derived(getVariant() === "danger" ? "danger" : "primary")
</script>

<AlertDialogPrimitive.Action onclick={onclick} {...rest}>
  {#snippet child({ props })}
    <Button {...(props as HTMLButtonAttributes)} size="small" variant={buttonVariant}>
      {@render children?.()}
    </Button>
  {/snippet}
</AlertDialogPrimitive.Action>
