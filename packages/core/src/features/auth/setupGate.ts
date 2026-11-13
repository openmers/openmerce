// 06-guvenlik-ve-yetki: "Admin kapalı başlar". Kurulum bitmeden (`setup.completed_at` satırı yok)
// Admin yüzeyinde yalnız kurulum prosedürleri açık; bitince kurulum kapısı kilitlenir.

/** Kurulum prosedürlerinin Admin router'ındaki yol öneki (ör. `setup.createOwner`). */
export const SETUP_PROCEDURE_PREFIX = "setup."

export type SetupGateInput = {
  surface: "shop" | "admin"
  /** Admin router içindeki nokta ayrımlı prosedür yolu. */
  procedure: string
  /** `settings (global, 0, 'setup.completed_at')` değeri; satır yoksa `null`. */
  setupCompletedAt: number | null
}

export type SetupGateDecision =
  | { allow: true }
  | { allow: false; reason: "SETUP_REQUIRED" | "SETUP_DONE" }

/** Saf karar; API'ye bağlama Admin uçlarıyla gelir. */
export function setupGate(input: SetupGateInput): SetupGateDecision {
  if (input.surface !== "admin") return { allow: true }
  const isSetup = input.procedure.startsWith(SETUP_PROCEDURE_PREFIX)
  const done = input.setupCompletedAt !== null
  if (!done && !isSetup) return { allow: false, reason: "SETUP_REQUIRED" }
  if (done && isSetup) return { allow: false, reason: "SETUP_DONE" }
  return { allow: true }
}
