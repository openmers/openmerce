<script lang="ts">
import { RadioGroup as RadioGroupPrimitive } from "bits-ui"
import { cn } from "../../utils/cn"
import { radioGroupChoiceBoxVariants, radioGroupIndicatorVariants } from "./variants"

type Props = Omit<RadioGroupPrimitive.ItemProps, "children"> & {
  label: string
  description: string
}

let { class: className, id, label, description, ...rest }: Props = $props()

const generatedId = $props.id()
const boxId = $derived(id ?? generatedId)
const descriptionId = $derived(`${boxId}-description`)
</script>

<RadioGroupPrimitive.Item
  class={cn(radioGroupChoiceBoxVariants(), className)}
  id={boxId}
  aria-describedby={descriptionId}
  {...rest}
>
  {#snippet children({ checked })}
    <div class="flex h-5 w-5 items-center justify-center">
      <div class={radioGroupIndicatorVariants()} data-indicator="">
        {#if checked}
          <div class="bg-card shadow-details-contrast-on-bg-interactive h-1.5 w-1.5 rounded-full"
          ></div>
        {/if}
      </div>
    </div>
    <div class="flex flex-col items-start">
      <span class="txt-compact-small font-medium group-disabled:text-fg-disabled">
        {label}
      </span>
      <span
        class="txt-small text-muted-foreground group-disabled:text-fg-disabled text-left"
        id={descriptionId}
      >
        {description}
      </span>
    </div>
  {/snippet}
</RadioGroupPrimitive.Item>
