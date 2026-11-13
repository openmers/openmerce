<script lang="ts">
import Button from "../button/Button.svelte"
import Skeleton from "../skeleton/Skeleton.svelte"
import TablePagination from "../table/TablePagination.svelte"
import { getDataTableContext } from "./context"

type Props = {
  translations?: {
    of?: string
    results?: string
    pages?: string
    prev?: string
    next?: string
  }
}

let { translations }: Props = $props()

const instance = getDataTableContext()
const pageCount = $derived(instance.getPageCount())
const canPreviousPage = $derived(instance.getCanPreviousPage())
const canNextPage = $derived(instance.getCanNextPage())
</script>

{#if instance.enablePagination}
  {#if instance.showSkeleton}
    <div>
      <div class="flex items-center justify-between p-4">
        <Skeleton class="h-7 w-[138px]" />
        <div class="flex items-center gap-x-2">
          <Skeleton class="h-7 w-24" />
          <Skeleton class="h-7 w-11" />
          <Skeleton class="h-7 w-11" />
        </div>
      </div>
    </div>
  {:else if instance.rowCount === undefined}
    <div class="txt-compact-small-plus flex w-full items-center justify-end gap-x-2 px-3 py-4 text-muted-foreground">
      <Button
        type="button"
        variant="transparent"
        onclick={instance.previousPage}
        disabled={!canPreviousPage}
      >
        {translations?.prev ?? "Prev"}
      </Button>
      <Button type="button" variant="transparent" onclick={instance.nextPage} disabled={!canNextPage}>
        {translations?.next ?? "Next"}
      </Button>
    </div>
  {:else}
    <TablePagination
      class="shrink-0"
      {translations}
      canNextPage={canNextPage}
      canPreviousPage={canPreviousPage}
      pageCount={pageCount ?? 0}
      count={instance.rowCount}
      nextPage={instance.nextPage}
      previousPage={instance.previousPage}
      pageIndex={instance.pageIndex}
      pageSize={instance.pageSize}
    />
  {/if}
{/if}
