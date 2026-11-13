import { CatalogError } from "../types"

/** The cursor only carries public fields: the internal `id` never reaches the client (02-api §1). */
export type ProductCursor = { updatedAt: number; publicId: string }

const CURSOR_SHAPE = /^(\d{1,16}):([A-Za-z0-9_]{1,64})$/

export function encodeProductCursor(cursor: ProductCursor): string {
  return `${cursor.updatedAt}:${cursor.publicId}`
}

export function decodeProductCursor(value: string): ProductCursor {
  const match = CURSOR_SHAPE.exec(value)
  if (!match) throw new CatalogError("INVALID_INPUT", "geçersiz imleç")
  return { updatedAt: Number(match[1]), publicId: match[2] as string }
}
