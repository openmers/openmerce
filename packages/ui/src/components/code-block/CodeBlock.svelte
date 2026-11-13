<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { Copy } from "../copy"

export type CodeSnippet = {
  label: string
  language: string
  code: string
  hideLineNumbers?: boolean
  hideCopy?: boolean
}

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  snippets: CodeSnippet[]
  hideLabels?: boolean
  children?: Snippet
}

let { snippets, hideLabels = false, class: className, children, ...rest }: Props = $props()

let active = $state(snippets[0])
let tabEls: Array<HTMLButtonElement | null> = $state([])
let indicatorLeft = $state("15px")
let indicatorWidth = $state("0px")

const lines = $derived(active ? active.code.split("\n") : [])

$effect(() => {
  const activeIndex = snippets.findIndex((snippet) => snippet.label === active?.label)
  const activeTab = tabEls[activeIndex]
  if (!activeTab) {
    return
  }
  indicatorWidth = `${activeTab.offsetWidth}px`
  if (activeIndex > 0) {
    const previousWidth = tabEls
      .slice(0, activeIndex)
      .reduce((total, tab) => total + (tab?.offsetWidth || 0) + 12, 0)
    indicatorLeft = `${previousWidth + 15}px`
  } else {
    indicatorLeft = "15px"
  }
})
</script>

{#if active}
  <div
    class={cn(
      "flex flex-col overflow-hidden rounded-xl bg-contrast-bg-base shadow-elevation-code-block",
      className,
    )}
    {...rest}
  >
    <div>
      <div
        class="flex items-start px-4 pt-2.5"
        role={hideLabels ? undefined : "tablist"}
        aria-label={hideLabels ? undefined : "Code snippets"}
      >
        {#if !hideLabels}
          {#each snippets as snippet, idx (snippet.label)}
            <button
              type="button"
              role="tab"
              aria-selected={active?.label === snippet.label}
              data-label={snippet.label}
              bind:this={tabEls[idx]}
              onclick={() => {
                active = snippet
              }}
              class={cn(
                "txt-compact-small-plus relative cursor-pointer pb-[9px] pr-3 text-contrast-fg-secondary transition-fg",
                { "cursor-default text-primary-foreground": active?.label === snippet.label },
              )}
            >
              {snippet.label}
            </button>
          {/each}
        {/if}
      </div>
      <div class="w-full px-0.5">
        <div class="relative h-px w-full bg-contrast-border-top">
          <div
            class="absolute bottom-0 transition-all duration-150 ease-linear motion-reduce:transition-none"
            style:left={indicatorLeft}
            style:width={indicatorWidth}
          >
            <div class="h-px rounded-full bg-primary-foreground"></div>
          </div>
        </div>
      </div>
    </div>
    {#if children || !active.hideCopy}
      <div class="flex min-h-10 items-center gap-x-3 border-t border-contrast-border-bot px-4 py-2">
        <div class="flex-1 text-contrast-fg-secondary">
          {@render children?.()}
        </div>
        {#if !active.hideCopy}
          <Copy content={active.code} class="text-contrast-fg-secondary" />
        {/if}
      </div>
    {/if}
    <div class="flex h-full flex-col overflow-hidden px-[5px] pb-[5px]">
      <div class="relative h-full overflow-y-auto rounded-lg border border-contrast-border-bot bg-contrast-bg-subtle p-4">
        <div class="max-w-[90%]">
          <pre
            class={cn("whitespace-pre-wrap bg-transparent", {
              "grid grid-cols-[auto,1fr] gap-x-4": !active.hideLineNumbers,
            })}>
            {#if !active.hideLineNumbers}
              <div role="presentation" class="flex flex-col text-right">
                {#each lines as _, index (index)}
                  <span class="tabular-nums text-contrast-fg-secondary">{index + 1}</span>
                {/each}
              </div>
            {/if}
            <div>
              {#each lines as line, index (index)}
                <div>{line || "\u00a0"}</div>
              {/each}
            </div>
          </pre>
        </div>
      </div>
    </div>
  </div>
{/if}
