import { integer, text } from "drizzle-orm/sqlite-core"

// Ortak sütunlar (00-genel "Ortak kurallar"): dışa açık önekli kimlik, UTC epoch ms zaman damgaları.
// Değerler Ctx saatinden ve newPublicId()'den gelir; DB varsayılanı yok.
export const publicId = () => text("public_id").notNull()
export const createdAt = () => integer("created_at").notNull()
export const updatedAt = () => integer("updated_at").notNull()
