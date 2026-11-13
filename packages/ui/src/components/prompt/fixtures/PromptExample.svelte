<script lang="ts">
import Prompt from "../Prompt.svelte"
import PromptAction from "../PromptAction.svelte"
import PromptCancel from "../PromptCancel.svelte"
import PromptContent from "../PromptContent.svelte"
import PromptDescription from "../PromptDescription.svelte"
import PromptFooter from "../PromptFooter.svelte"
import PromptHeader from "../PromptHeader.svelte"
import PromptTitle from "../PromptTitle.svelte"
import PromptTrigger from "../PromptTrigger.svelte"

let { open = $bindable(false), confirmation = false } = $props<{
  open?: boolean
  confirmation?: boolean
}>()
</script>

<Prompt bind:open variant={confirmation ? "confirmation" : "danger"}>
  <PromptTrigger>Mağazayı sil</PromptTrigger>
  <PromptContent>
    <PromptHeader>
      <PromptTitle>Mağazayı sil</PromptTitle>
      <PromptDescription>Bu işlem geri alınamaz.</PromptDescription>
    </PromptHeader>
    <PromptFooter>
      <PromptCancel>Vazgeç</PromptCancel>
      <PromptAction>Sil</PromptAction>
    </PromptFooter>
  </PromptContent>
</Prompt>
