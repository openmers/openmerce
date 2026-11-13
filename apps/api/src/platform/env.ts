import { z } from "zod"

/**
 * Ortam değişkenleri **yalnız** burada okunur (`03-cekirdek/07-yapilandirma` §11): `core` ve `db`
 * global `env` görmez. `OPENMERS_DB` SQLite dosya yoludur; migration'lar açılıştan önce uygulanmış
 * varsayılır (madde 6.10 çalıştırıcısı). KEK yoksa kasa uykudadır (madde 11), açılış düşmez.
 */
export const envSchema = z.object({
  OPENMERS_DB: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  // Yönetici oturum çerezinin imzası (Better Auth `secret`); yoksa açılış düşer.
  OPENMERS_AUTH_SECRET: z
    .string()
    .min(32, "OPENMERS_AUTH_SECRET en az 32 karakter olmalı (ör. `openssl rand -base64 32`)"),
  OPENMERS_KEK: z
    .string()
    .min(32, "OPENMERS_KEK en az 32 karakter olmalı (ör. `openssl rand -base64 32`)")
    .optional(), // HKDF parola KDF değildir: zayıf KEK kaba kuvvete açıktır,
})

export type Env = z.infer<typeof envSchema>

export class EnvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EnvError"
  }
}

/** Doğrular ve döner; geçersizse gövdeli tek hata (hangi değişken, ne bekleniyor). */
export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(kök)"}: ${issue.message}`)
      .join("; ")
    throw new EnvError(`ortam değişkenleri geçersiz: ${detail}`)
  }
  return parsed.data
}
