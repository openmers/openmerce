<script lang="ts">
import OtpInput from "../OtpInput.svelte"

let { value = $bindable(""), onComplete } = $props<{
  value?: string
  onComplete?: (value: string) => void
}>()
</script>

<OtpInput bind:value {onComplete} />
