// Race test (plan §2.5, decision 7): exactly one winner among Promise.allSettled results,
// every loser with its documented error code. The final DB state is asserted by the test itself.

const codeOf = (reason: unknown): unknown =>
  typeof reason === "object" && reason !== null && "code" in reason ? reason.code : undefined

/** Fails unless exactly one `fulfilled` result and every other `rejected` carries `loserCode`. Returns the winner's value. */
export function expectExactlyOneWinner<T>(
  results: readonly PromiseSettledResult<T>[],
  loserCode: string,
): T {
  const winners = results.filter((r) => r.status === "fulfilled")
  if (winners.length !== 1) {
    throw new Error(`tam bir kazanan bekleniyordu, ${winners.length} kazanan var`)
  }
  for (const r of results) {
    if (r.status === "rejected" && codeOf(r.reason) !== loserCode) {
      throw new Error(`kaybeden ${loserCode} bekleniyordu, gelen: ${String(codeOf(r.reason))}`, {
        cause: r.reason,
      })
    }
  }
  return (winners[0] as PromiseFulfilledResult<T>).value
}
