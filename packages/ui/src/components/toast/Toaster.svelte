<script lang="ts">
import { Toaster as SonnerToaster, type ToasterProps as SonnerToasterProps } from "svelte-sonner"

// svelte-sonner has no `cn`/`theme`/`richColors`/`icons`; the kit excluded that API too, so the same narrowing applies.
type Props = Omit<
  SonnerToasterProps,
  "richColors" | "closeButton" | "icons" | "theme" | "invert" | "toastOptions"
> & {
  duration?: number
}

let { position = "bottom-right", gap = 12, offset = 24, duration, ...rest }: Props = $props()
</script>

<SonnerToaster {position} {gap} {offset} toastOptions={{ duration }} {...rest} />
