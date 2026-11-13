import { scheduledRuns } from "@openmers/db"
import type { AtomicStatement, Db, Platform } from "../../../platform"

export type ClaimRunInput = {
  task: string
  /** Start of the period according to cron, epoch ms. */
  period: number
  now: number
}

/**
 * Conditionally inserts the run into the unique `(task, period)` row; exactly one of two triggers wins.
 * If the row already exists, 0 rows are returned and the task does not run.
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

/** `true` = this call claimed the run. */
export async function claimRun(
  p: Pick<Platform, "db" | "atomic">,
  input: ClaimRunInput,
): Promise<boolean> {
  const [n = 0] = await p.atomic([claimRunStatement(p.db, input)])
  return n > 0
}
