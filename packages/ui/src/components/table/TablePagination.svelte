<script lang="ts">
import Minus from "@lucide/svelte/icons/minus"
import type { HTMLAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { Button } from "../button"

type Props = HTMLAttributes<HTMLDivElement> & {
  count: number
  pageSize: number
  pageIndex: number
  pageCount: number
  canPreviousPage: boolean
  canNextPage: boolean
  translations?: {
    of?: string
    results?: string
    pages?: string
    prev?: string
    next?: string
  }
  previousPage: () => void
  nextPage: () => void
}

let {
  class: className,
  count,
  pageSize,
  pageCount,
  pageIndex,
  canPreviousPage,
  canNextPage,
  nextPage,
  previousPage,
  translations = {
    of: "of",
    results: "results",
    pages: "pages",
    prev: "Prev",
    next: "Next",
  },
  ...rest
}: Props = $props()

const from = $derived(count === 0 ? count : pageIndex * pageSize + 1)
const to = $derived(Math.min(count, (pageIndex + 1) * pageSize))
</script>

<div
  class={cn(
    "txt-compact-small-plus flex w-full items-center justify-between px-3 py-4 text-muted-foreground",
    className,
  )}
  {...rest}
>
  <div class="inline-flex items-center gap-x-1 px-3 py-[5px]">
    <p>{from}</p>
    <Minus class="text-fg-muted" aria-hidden="true" />
    <p>{`${to} ${translations.of} ${count} ${translations.results}`}</p>
  </div>
  <div class="flex items-center gap-x-2">
    <div class="inline-flex items-center gap-x-1 px-3 py-[5px]">
      <p>
        {pageIndex + 1}
        {translations.of}
        {Math.max(pageCount, 1)}
        {translations.pages}
      </p>
    </div>
    <Button type="button" variant="transparent" onclick={previousPage} disabled={!canPreviousPage}>
      {translations.prev}
    </Button>
    <Button type="button" variant="transparent" onclick={nextPage} disabled={!canNextPage}>
      {translations.next}
    </Button>
  </div>
</div>
