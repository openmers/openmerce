import { useState } from "react"

/**
 * Cursor pagination for the controlled DataTable: page N is fetched with the cursor the API returned
 * for page N-1 (kept in a stack so "previous" needs no extra request).
 */
export function useCursorPages(pageSize: number) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  const pageIndex = cursors.length - 1

  return {
    cursor: cursors[pageIndex],
    pagination: (nextCursor: string | null | undefined) => ({
      state: { pageIndex, pageSize },
      onPaginationChange: (next: { pageIndex: number }) => {
        if (next.pageIndex < pageIndex) setCursors((stack) => stack.slice(0, next.pageIndex + 1))
        else if (next.pageIndex > pageIndex && nextCursor)
          setCursors((stack) => [...stack, nextCursor])
      },
    }),
  }
}
