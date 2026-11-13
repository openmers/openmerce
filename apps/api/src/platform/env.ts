import { z } from "zod"

/**
 * Environment variables are read **only** here (`03-cekirdek/07-yapilandirma` §11): `core` and `db`
 * never see the global `env`. `OPENMERS_DB` is the SQLite file path; migrations are assumed to be
 * applied before startup (item 6.10 runner). Without a KEK the vault is dormant (item 11); startup does not fail.
 */
export const envSchema = z.object({
  OPENMERS_DB: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  // Signing secret of the admin session cookie (Better Auth `secret`); startup fails without it.
  OPENMERS_AUTH_SECRET: z
    .string()
    .min(32, "OPENMERS_AUTH_SECRET en az 32 karakter olmalı (ör. `openssl rand -base64 32`)"),
  OPENMERS_KEK: z
    .string()
    .min(32, "OPENMERS_KEK en az 32 karakter olmalı (ör. `openssl rand -base64 32`)")
    .optional(), // HKDF is not a password KDF: a weak KEK is open to brute force,
})

export type Env = z.infer<typeof envSchema>

export class EnvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EnvError"
  }
}

/** Validates and returns; if invalid, a single error with details (which variable, what is expected). */
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
