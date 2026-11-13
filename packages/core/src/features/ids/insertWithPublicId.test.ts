import { channels } from "@openmers/db"
import { describeOnTargets } from "@openmers/test-utils"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../__testing__/sqlitePlatform"
import { insertChannelStatement } from "../channels/queries/insertChannel"
import { insertWithPublicId, isPublicIdCollision } from "./insertWithPublicId"

const NOW = 1_700_000_000_000

/** Her denemede farklı `code`: böylece yalnız `public_id` çakışması sınanır. */
const channelInput = (publicId: string, code = `c-${publicId}`) => ({
  publicId,
  code,
  defaultCurrency: "USD",
  currencies: ["USD"],
  defaultLang: "en",
  langs: ["en"],
  timezone: "UTC",
})

/** Sırayla verilen bayt değerlerini döner; liste bitince son değeri tekrarlar. */
function sequence(values: number[]) {
  let index = 0
  return (length: number) => {
    const value = values[Math.min(index, values.length - 1)] ?? 0
    index += 1
    return new Uint8Array(length).fill(value)
  }
}

describe("isPublicIdCollision", () => {
  it("yalnız public_id benzersiz ihlalini yeniden denenebilir sayar", () => {
    expect(isPublicIdCollision(new Error("UNIQUE constraint failed: channels.public_id"))).toBe(
      true,
    )
    expect(isPublicIdCollision(new Error("UNIQUE constraint failed: channels.code"))).toBe(false)
    expect(isPublicIdCollision(new Error("CHECK constraint failed"))).toBe(false)
  })
})

describeOnTargets("insertWithPublicId", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("çakışmada yeni kimlikle yeniden dener", async () => {
    const p = platform()
    // İlk satır `chn_1111111111` kimliğini alır; üreteç önce aynı kimliği verir, sonra başkasını.
    await p.atomic([insertChannelStatement(p.db, channelInput("chn_1111111111", "seeded"), NOW)])

    const publicId = await insertWithPublicId(
      p,
      (generated) => [insertChannelStatement(p.db, channelInput(generated), NOW)],
      { prefix: "chn_", random: sequence([1, 1, 2]) },
    )
    expect(publicId).toBe("chn_2222222222")
    expect(await p.db.select().from(channels)).toHaveLength(2)
  })

  it("üç denemede de çakışırsa son hatayı yükseltir", async () => {
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

  it("başka bir benzersiz sütunun ihlali yeniden denenmez", async () => {
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
