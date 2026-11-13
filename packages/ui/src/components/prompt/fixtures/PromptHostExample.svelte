<script lang="ts">
import PromptHost from "../PromptHost.svelte"
import { prompt } from "../prompt-state.svelte"

let {
  verificationText = undefined,
  verificationInstruction = undefined,
  variant = "danger",
} = $props<{
  verificationText?: string
  verificationInstruction?: string
  variant?: "danger" | "confirmation"
}>()

let result = $state<string>("bekliyor")

async function ask() {
  const confirmed = await prompt({
    title: "Mağazayı sil",
    description: "Bu işlem geri alınamaz.",
    variant,
    verificationText,
    verificationInstruction,
    confirmText: "Sil",
    cancelText: "Vazgeç",
  })
  result = confirmed ? "onaylandı" : "iptal"
}
</script>

<button type="button" onclick={ask}>Sor</button>
<PromptHost />
<p data-testid="result">{result}</p>
