import type { Platform } from "../../platform"
import type { Kek } from "./crypto"

export type SecretErrorCode = "VAULT_ASLEEP" | "SECRET_NOT_FOUND" | "INVALID_SECRET"

export class SecretError extends Error {
  constructor(
    readonly code: SecretErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "SecretError"
  }
}

/** KEK yoksa (ya da boşsa) kasa uykuda: mağaza demo kipte çalışır, sır yazılmaz/okunmaz. */
export function isDemoMode(p: Pick<Platform, "secrets">): boolean {
  const kek = p.secrets.kek
  return kek === undefined || kek === ""
}

/** Kasa uyanıksa KEK'i döner, uykudaysa açık hata. */
export function requireKek(p: Pick<Platform, "secrets">): Kek {
  const kek = p.secrets.kek
  if (kek === undefined || isDemoMode(p)) {
    throw new SecretError("VAULT_ASLEEP", "KEK yok: kasa uykuda (demo kip)")
  }
  return kek
}
