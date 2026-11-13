import { z } from "zod"

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100
export const MAX_CURSOR_LENGTH = 512

/**
 * Cursor-paginated list input. On GET endpoints the number conversion is done by Smart Coercion in the handler;
 * the contract declares a plain `number` (POST and GET use the same schema).
 */
export const cursorInputSchema = z.object({
  cursor: z.string().min(1).max(MAX_CURSOR_LENGTH).optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type CursorInput = z.infer<typeof cursorInputSchema>

export type Page<T> = { items: T[]; nextCursor: string | null }

/** List response: `{ items, nextCursor }`; the total count only via `withTotal`. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().max(MAX_CURSOR_LENGTH).nullable(),
  })
}

/** Adds `total` to the `pageSchema` output; used only on endpoints that explicitly ask for it. */
export function withTotal<S extends z.ZodRawShape>(page: z.ZodObject<S>) {
  return page.extend({ total: z.number().int().nonnegative() })
}
