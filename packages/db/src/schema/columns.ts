import { integer, text } from "drizzle-orm/sqlite-core"

// Shared columns (00-genel "Common rules"): externally visible prefixed id, UTC epoch ms timestamps.
// Values come from the Ctx clock and newPublicId(); no DB default.
export const publicId = () => text("public_id").notNull()
export const createdAt = () => integer("created_at").notNull()
export const updatedAt = () => integer("updated_at").notNull()
