<script lang="ts">
import CommandBar from "../command-bar/CommandBar.svelte"
import CommandBarBar from "../command-bar/CommandBarBar.svelte"
import CommandBarCommand from "../command-bar/CommandBarCommand.svelte"
import CommandBarSeparator from "../command-bar/CommandBarSeparator.svelte"
import CommandBarValue from "../command-bar/CommandBarValue.svelte"
import { getDataTableContext } from "./context"

type Props = {
  selectedLabel?: ((count: number) => string) | string
}

let { selectedLabel }: Props = $props()

const instance = getDataTableContext()
const commands = $derived(instance.getCommands())
const rowSelection = $derived(instance.getRowSelection())
const count = $derived(Object.keys(rowSelection ?? {}).length)
const open = $derived(commands.length > 0 && count > 0)
const label = $derived(typeof selectedLabel === "function" ? selectedLabel(count) : selectedLabel)
</script>

{#if commands.length > 0}
  <CommandBar {open}>
    <CommandBarBar>
      {#if selectedLabel}
        <CommandBarValue>{label}</CommandBarValue>
        <CommandBarSeparator />
      {/if}
      {#each commands as command, index (command.label)}
        <CommandBarCommand
          action={() => command.action(rowSelection)}
          label={command.label}
          shortcut={command.shortcut}
          disabled={!open}
        />
        {#if index < commands.length - 1}
          <CommandBarSeparator />
        {/if}
      {/each}
    </CommandBarBar>
  </CommandBar>
{/if}
