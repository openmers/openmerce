import { describe, expect, it } from "vitest"
import { objectUrl, presign } from "./presign"

// Published SigV4 query-auth example (GET examplebucket/test.txt, 2013-05-24, 86400 s).
const example = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  endpoint: "https://s3.amazonaws.com",
  bucket: "examplebucket",
}

describe("presign", () => {
  it("matches the fixed SigV4 vector", async () => {
    const url = await presign(example, {
      method: "GET",
      key: "test.txt",
      expiresIn: 86_400,
      now: Date.UTC(2013, 4, 24),
    })
    expect(url).toBe(
      "https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256" +
        "&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request" +
        "&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host" +
        "&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
    )
  })

  it("path style puts the bucket in the path and encodes key segments", () => {
    const url = objectUrl(
      { ...example, endpoint: "https://acc.r2.cloudflarestorage.com", pathStyle: true },
      "public/a b/c.png",
    )
    expect(url.toString()).toBe(
      "https://acc.r2.cloudflarestorage.com/examplebucket/public/a%20b/c.png",
    )
  })

  it("rejects an out-of-range expiry", async () => {
    await expect(
      presign(example, { method: "PUT", key: "k", expiresIn: 0, now: 0 }),
    ).rejects.toThrow()
  })
})
