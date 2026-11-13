import { z } from "zod"

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100
export const MAX_CURSOR_LENGTH = 512

/**
 * İmleçli liste girdisi. GET uçlarında sayı dönüşümü işleyicideki Smart Coercion'dadır;
 * sözleşme düz `number` derler (POST ve GET aynı şemayı kullanır).
 */
export const cursorInputSchema = z.object({
  cursor: z.string().min(1).max(MAX_CURSOR_LENGTH).optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type CursorInput = z.infer<typeof cursorInputSchema>

export type Page<T> = { items: T[]; nextCursor: string | null }

/** Liste yanıtı: `{ items, nextCursor }`; toplam sayı yalnız `withTotal` ile. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().max(MAX_CURSOR_LENGTH).nullable(),
  })
}

/** `pageSchema` çıktısına `total` ekler; yalnız açıkça istenen uçlarda kullanılır. */
export function withTotal<S extends z.ZodRawShape>(page: z.ZodObject<S>) {
  return page.extend({ total: z.number().int().nonnegative() })
}
