// Yarış testi (plan §2.5, karar 7): Promise.allSettled sonuçlarında tam bir kazanan,
// kaybedenler belgelenen hata koduyla. Son DB durumu kontrolü testin kendisindedir.

const codeOf = (reason: unknown): unknown =>
  typeof reason === "object" && reason !== null && "code" in reason ? reason.code : undefined

/** Tam bir `fulfilled` ve kalan her `rejected`'ın `code`'u `loserCode` değilse kırılır. Kazananın değerini döner. */
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
