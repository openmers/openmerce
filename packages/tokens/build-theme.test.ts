import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { tokens } from "./src/index"

const css = readFileSync(new URL("../ui/src/theme.css", import.meta.url), "utf8")
const block = (selector: string) => css.split(`${selector} {`)[1]?.split("\n}")[0] ?? ""

describe("theme.css", () => {
  const names = Object.keys(tokens.colors.light)

  it("defines all 90 colors in light and dark blocks with token values", () => {
    expect(names).toHaveLength(90)
    const light = block(":root")
    const dark = block('[data-mode="dark"]')
    for (const n of names) {
      expect(light).toContain(
        `--${n}: ${tokens.colors.light[n as keyof typeof tokens.colors.light]};`,
      )
      expect(dark).toContain(`--${n}: ${tokens.colors.dark[n as keyof typeof tokens.colors.dark]};`)
    }
  })

  it("maps every color and shadow to a Tailwind theme variable", () => {
    for (const n of names) expect(css).toContain(`--color-${n}: var(--${n});`)
    for (const n of Object.keys(tokens.shadows.light)) {
      expect(css).toContain(`--shadow-${n}: var(--${n});`)
    }
  })

  it("is marked as generated", () => {
    expect(css.startsWith("/* ÜRETİLDİ")).toBe(true)
  })
})
