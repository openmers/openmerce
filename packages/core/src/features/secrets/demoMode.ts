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

/** Without a KEK (or with an empty one) the vault is dormant: the store runs in demo mode, no secrets are written/read. */
export function isDemoMode(p: Pick<Platform, "secrets">): boolean {
  const kek = p.secrets.kek
  return kek === undefined || kek === ""
}

/** Returns the KEK if the vault is awake, an explicit error if dormant. */
export function requireKek(p: Pick<Platform, "secrets">): Kek {
  const kek = p.secrets.kek
  if (kek === undefined || isDemoMode(p)) {
    throw new SecretError("VAULT_ASLEEP", "KEK yok: kasa uykuda (demo kip)")
  }
  return kek
}
