<script lang="ts">
import { cn } from "../../utils/cn"
import Prompt from "./Prompt.svelte"
import PromptAction from "./PromptAction.svelte"
import PromptCancel from "./PromptCancel.svelte"
import PromptContent from "./PromptContent.svelte"
import PromptDescription from "./PromptDescription.svelte"
import PromptFooter from "./PromptFooter.svelte"
import PromptHeader from "./PromptHeader.svelte"
import PromptTitle from "./PromptTitle.svelte"
import { getPromptRequest, settlePrompt } from "./prompt-state.svelte"
import { promptInputVariants } from "./variants"

// Medusa `hooks/use-prompt`: söz döndüren onay penceresi. Kök düzende tek `<PromptHost />`.
let input = $state("")
const current = $derived(getPromptRequest())

const validInput = $derived(!current?.verificationText || input === current.verificationText)
const instructionParts = $derived(
  current?.verificationInstruction?.includes("{val}")
    ? (current.verificationInstruction.split("{val}") as [string, string])
    : (["Please type", "to confirm:"] as [string, string]),
)

$effect(() => {
  void current
  input = ""
})

function handleSubmit(event: SubmitEvent) {
  event.preventDefault()
  if (validInput) settlePrompt(true)
}

function handleOpenChange(open: boolean) {
  if (!open) settlePrompt(false)
}
</script>

<svelte:document
  onkeydown={(event) => {
    if (event.key === "Escape" && current) settlePrompt(false)
  }}
/>

<Prompt
  open={current !== null}
  variant={current?.variant ?? "danger"}
  onOpenChange={handleOpenChange}
>
  <PromptContent>
    <form onsubmit={handleSubmit}>
      <PromptHeader>
        <PromptTitle>{current?.title}</PromptTitle>
        <PromptDescription>{current?.description}</PromptDescription>
      </PromptHeader>
      {#if current?.verificationText}
        <div class="border-border mt-6 flex flex-col gap-y-4 border-y p-6">
          <label class="text-muted-foreground txt-compact-small" for="prompt-verification">
            {instructionParts[0]}
            <span class="txt-compact-medium-plus text-foreground">{current.verificationText}</span>
            {instructionParts[1]}
          </label>
          <input
            autofocus
            autocomplete="off"
            id="prompt-verification"
            class={cn(promptInputVariants())}
            placeholder={current.verificationText}
            bind:value={input}
          />
        </div>
      {/if}
      <PromptFooter>
        <PromptCancel onclick={() => settlePrompt(false)}>
          {current?.cancelText ?? "Cancel"}
        </PromptCancel>
        <PromptAction
          type={current?.verificationText ? "submit" : "button"}
          disabled={!validInput}
          onclick={current?.verificationText ? undefined : () => settlePrompt(true)}
        >
          {current?.confirmText ?? "Confirm"}
        </PromptAction>
      </PromptFooter>
    </form>
  </PromptContent>
</Prompt>
