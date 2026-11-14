import type { Images, Storage } from "../../../platform"
import { sizedKey, sizeLadder } from "./sizeLadder"

/** Upload-time resizer (Cloudflare Images binding / `sharp` on Node); the platform `images` port. */
export type ImageProcessor = Images

/**
 * Writes the WebP ladder for an image. An optimisation only (performance §7): any failure or a
 * missing processor yields `[]` and the original is served as the single size.
 */
export async function generateLadder(
  processor: ImageProcessor | undefined,
  storage: Pick<Storage, "put" | "delete">,
  input: { key: string; width: number | null; bytes: () => Promise<Uint8Array> },
): Promise<number[]> {
  const steps = sizeLadder(input.width)
  if (!processor || steps.length === 0) return []
  const done: number[] = []
  try {
    const original = await input.bytes()
    for (const width of steps) {
      const out = await processor.resize(original, { width, format: "webp" })
      await storage.put(sizedKey(input.key, width), out, { contentType: "image/webp" })
      done.push(width)
    }
    return done
  } catch {
    await Promise.allSettled(done.map((w) => storage.delete(sizedKey(input.key, w))))
    return []
  }
}
