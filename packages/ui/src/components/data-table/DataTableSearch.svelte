<script lang="ts">
import { cn } from "../../utils/cn"
import Input from "../input/Input.svelte"
import Skeleton from "../skeleton/Skeleton.svelte"
import { getDataTableContext } from "./context"

type Props = {
  autoFocus?: boolean
  class?: string
  placeholder?: string
}

let { autoFocus, class: className, placeholder }: Props = $props()

const instance = getDataTableContext()
</script>

{#if instance.enableSearch}
  {#if instance.showSkeleton}
    <Skeleton class="h-7 w-[128px]" />
  {:else}
    <Input
      size="small"
      type="search"
      value={instance.getSearch()}
      oninput={(event) => instance.onSearchChange(event.currentTarget.value)}
      class={cn({ "pr-[calc(15px+2px+8px)]": instance.isLoading }, className)}
      {autoFocus}
      {placeholder}
    />
  {/if}
{/if}
