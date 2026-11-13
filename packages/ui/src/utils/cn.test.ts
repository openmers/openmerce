import { describe, expect, it } from "vitest"
import { cn } from "./cn"

describe("cn", () => {
  it("merges conflicting Tailwind classes, last wins", () => {
    expect(cn("px-2 py-1 bg-background", "px-4", false && "hidden", "bg-card")).toBe(
      "py-1 px-4 bg-card",
    )
  })

  it("keeps non-conflicting custom token classes", () => {
    expect(cn("text-muted-foreground", "shadow-buttons-neutral", "transition-fg")).toBe(
      "text-muted-foreground shadow-buttons-neutral transition-fg",
    )
  })
})
