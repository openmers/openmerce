import { scheduledRuns } from "@openmers/db"
import type { AtomicStatement, Db, Platform } from "../../../platform"

export type ClaimRunInput = {
  task: string
  /** Dönemin cron'a göre başlangıcı, epoch ms. */
  period: number
  now: number
}

/**
 * Çalıştırmayı `(task, period)` benzersiz satırına koşullu ekler; iki tetikten tam biri kazanır.
 * Satır önceden varsa 0 satır döner ve görev çalıştırılmaz.
 */
export function claimRunStatement(db: Db, input: ClaimRunInput): AtomicStatement {
  return db
    .insert(scheduledRuns)
    .values({
      task: input.task,
      period: input.period,
      status: "running",
      startedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoNothing({ target: [scheduledRuns.task, scheduledRuns.period] })
    .toSQL()
}

/** `true` = bu çağrı çalıştırmayı sahiplendi. */
export async function claimRun(
  p: Pick<Platform, "db" | "atomic">,
  input: ClaimRunInput,
): Promise<boolean> {
  const [n = 0] = await p.atomic([claimRunStatement(p.db, input)])
  return n > 0
}
