import { channels } from "@openmers/db"
import { describeOnTargets } from "@openmers/test-utils"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../__testing__/sqlitePlatform"
import { insertChannelStatement } from "../channels/queries/insertChannel"
import { insertWithPublicId, isPublicIdCollision } from "./insertWithPublicId"

const NOW = 1_700_000_000_000

/** A different `code` on every attempt: so only a `public_id` collision is tested. */
const channelInput = (publicId: string, code = `c-${publicId}`) => ({
  publicId,
  code,
  defaultCurrency: "USD",
  currencies: ["USD"],
  defaultLang: "en",
  langs: ["en"],
  timezone: "UTC",
})

/** Returns the given byte values in order; repeats the last value once the list runs out. */
function sequence(values: number[]) {
  let index = 0
  return (length: number) => {
    const value = values[Math.min(index, values.length - 1)] ?? 0
    index += 1
    return new Uint8Array(length).fill(value)
  }
}

describe("isPublicIdCollision", () => {
  it("only treats a public_id unique violation as retryable", () => {
    expect(isPublicIdCollision(new Error("UNIQUE constraint failed: channels.public_id"))).toBe(
      true,
    )
    expect(isPublicIdCollision(new Error("UNIQUE constraint failed: channels.code"))).toBe(false)
    expect(isPublicIdCollision(new Error("CHECK constraint failed"))).toBe(false)
  })
})

describeOnTargets("insertWithPublicId", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("retries with a new id on collision", async () => {
    const p = platform()
    // The first row takes the id `chn_1111111111`; the generator first gives the same id, then another.
    await p.atomic([insertChannelStatement(p.db, channelInput("chn_1111111111", "seeded"), NOW)])

    const publicId = await insertWithPublicId(
      p,
      (generated) => [insertChannelStatement(p.db, channelInput(generated), NOW)],
      { prefix: "chn_", random: sequence([1, 1, 2]) },
    )
    expect(publicId).toBe("chn_2222222222")
    expect(await p.db.select().from(channels)).toHaveLength(2)
  })

  it("raises the last error if all three attempts collide", async () => {
    const p = platform()
    await p.atomic([insertChannelStatement(p.db, channelInput("chn_1111111111", "seeded"), NOW)])

    await expect(
      insertWithPublicId(
        p,
        (generated) => [insertChannelStatement(p.db, channelInput(generated), NOW)],
        { prefix: "chn_", random: sequence([1]) },
      ),
    ).rejects.toThrow(/UNIQUE/)
    expect(await p.db.select().from(channels)).toHaveLength(1)
  })

  it("a violation of another unique column is not retried", async () => {
    const p = platform()
    await p.atomic([insertChannelStatement(p.db, channelInput("chn_1111111111", "seeded"), NOW)])

    let attempts = 0
    const random = (length: number) => {
      attempts += 1
      return new Uint8Array(length).fill(7)
    }
    await expect(
      insertWithPublicId(
        p,
        (generated) => [insertChannelStatement(p.db, channelInput(generated, "seeded"), NOW)],
        { prefix: "chn_", random },
      ),
    ).rejects.toThrow(/UNIQUE/)
    expect(attempts).toBe(1)
  })
})
