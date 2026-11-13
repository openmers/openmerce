<script lang="ts">
import Input from "../../input/Input.svelte"

type Props = {
  value?: string
  placeholder?: string
  onUpdate: (value: unknown) => void
}

let { value: initialValue, placeholder = "Enter value...", onUpdate }: Props = $props()

// İlk değer dışarıdan gelir; sonraki değişimler aşağıdaki effect ile eşitlenir.
// svelte-ignore state_referenced_locally
let value = $state(initialValue ?? "")
let timer: ReturnType<typeof setTimeout> | undefined

$effect(() => {
  value = initialValue ?? ""
})

$effect(() => {
  return () => {
    if (timer) clearTimeout(timer)
  }
})

function commit(next: string) {
  if (timer) clearTimeout(timer)
  onUpdate(next.trim() || undefined)
}

function handleInput(next: string) {
  value = next
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => commit(next), 500)
}
</script>

<div class="w-[250px] p-3">
  <Input
    {placeholder}
    value={value}
    oninput={(event) => handleInput(event.currentTarget.value)}
    onkeydown={(event) => {
      if (event.key === "Enter") commit(value)
    }}
  />
</div>
