import { scheduledRuns } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"

export type FinishRunInput = {
  task: string
  period: number
  now: number
  status: "done" | "failed"
  error?: string
}

/** Closes a run opened with `claimRun` (no `running` row is left hanging). */
export function finishRunStatement(db: Db, input: FinishRunInput): AtomicStatement {
  return db
    .update(scheduledRuns)
    .set({
      status: input.status,
      finishedAt: input.now,
      error: input.error ?? null,
      updatedAt: input.now,
    })
    .where(and(eq(scheduledRuns.task, input.task), eq(scheduledRuns.period, input.period)))
    .toSQL()
}

/** `true` = the run row was closed in this call. */
export async function finishRun(
  p: Pick<Platform, "db" | "atomic">,
  input: FinishRunInput,
): Promise<boolean> {
  const [n = 0] = await p.atomic([finishRunStatement(p.db, input)])
  return n > 0
}
