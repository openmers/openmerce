// 06-guvenlik-ve-yetki: "Admin starts closed". Before setup is done (no `setup.completed_at` row)
// only setup procedures are open on the Admin surface; once done, the setup gate locks.

/** Path prefix of setup procedures in the Admin router (e.g. `setup.createOwner`). */
export const SETUP_PROCEDURE_PREFIX = "setup."

export type SetupGateInput = {
  surface: "shop" | "admin"
  /** Dot-separated procedure path within the Admin router. */
  procedure: string
  /** Value of `settings (global, 0, 'setup.completed_at')`; `null` if there is no row. */
  setupCompletedAt: number | null
}

export type SetupGateDecision =
  | { allow: true }
  | { allow: false; reason: "SETUP_REQUIRED" | "SETUP_DONE" }

/** Pure decision; wiring into the API comes with the Admin endpoints. */
export function setupGate(input: SetupGateInput): SetupGateDecision {
  if (input.surface !== "admin") return { allow: true }
  const isSetup = input.procedure.startsWith(SETUP_PROCEDURE_PREFIX)
  const done = input.setupCompletedAt !== null
  if (!done && !isSetup) return { allow: false, reason: "SETUP_REQUIRED" }
  if (done && isSetup) return { allow: false, reason: "SETUP_DONE" }
  return { allow: true }
}
