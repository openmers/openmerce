// Pure: the fixed width ladder generated on upload (12-medya) and the `srcset` built from it.

export const SIZE_LADDER: readonly number[] = [320, 640, 1000]

/** Ladder steps strictly narrower than the original (no upscaling); unknown width → none. */
export function sizeLadder(width: number | null, ladder: readonly number[] = SIZE_LADDER) {
  return width === null ? [] : ladder.filter((w) => w < width)
}

/** Key of a generated size: `public/media/abc.jpg` → `public/media/abc_640.webp`. */
export function sizedKey(key: string, width: number): string {
  const slash = key.lastIndexOf("/")
  const dot = key.lastIndexOf(".")
  const stem = dot > slash ? key.slice(0, dot) : key
  return `${stem}_${width}.webp`
}

/** `url 320w, …, original Nw`; `null` when only the original exists (single size served). */
export function srcset(
  urlOf: (key: string) => string,
  key: string,
  sizes: readonly number[],
  width: number | null,
): string | null {
  if (sizes.length === 0) return null
  const steps = [...sizes].sort((a, b) => a - b).map((w) => `${urlOf(sizedKey(key, w))} ${w}w`)
  if (width !== null) steps.push(`${urlOf(key)} ${width}w`)
  return steps.join(", ")
}
