import { Minus } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { Button } from "../button"

type Props = ComponentProps<"div"> & {
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

export function TablePagination({
  className,
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
}: Props) {
  const from = count === 0 ? count : pageIndex * pageSize + 1
  const to = Math.min(count, (pageIndex + 1) * pageSize)

  return (
    <div
      className={cn(
        "txt-compact-small-plus flex w-full items-center justify-between px-3 py-4 text-muted-foreground",
        className,
      )}
      {...rest}
    >
      <div className="inline-flex items-center gap-x-1 px-3 py-[5px]">
        <p>{from}</p>
        <Minus className="text-fg-muted" aria-hidden="true" />
        <p>{`${to} ${translations.of} ${count} ${translations.results}`}</p>
      </div>
      <div className="flex items-center gap-x-2">
        <div className="inline-flex items-center gap-x-1 px-3 py-[5px]">
          <p>
            {`${pageIndex + 1} ${translations.of} ${Math.max(pageCount, 1)} ${translations.pages}`}
          </p>
        </div>
        <Button
          type="button"
          variant="transparent"
          onClick={previousPage}
          disabled={!canPreviousPage}
        >
          {translations.prev}
        </Button>
        <Button type="button" variant="transparent" onClick={nextPage} disabled={!canNextPage}>
          {translations.next}
        </Button>
      </div>
    </div>
  )
}
