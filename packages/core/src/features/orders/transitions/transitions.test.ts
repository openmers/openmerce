import { describe, expect, it } from "vitest"
import { canTransition, ORDER_TRANSITIONS } from "./transitions"

describe("order transitions", () => {
  it("placed can complete or cancel", () => {
    expect(canTransition("placed", "completed")).toBe(true)
    expect(canTransition("placed", "cancelled")).toBe(true)
  })

  it("final states have no way out and nothing returns to placed", () => {
    expect(ORDER_TRANSITIONS.completed).toEqual([])
    expect(ORDER_TRANSITIONS.cancelled).toEqual([])
    expect(canTransition("completed", "placed")).toBe(false)
    expect(canTransition("cancelled", "completed")).toBe(false)
    expect(canTransition("placed", "placed")).toBe(false)
  })
})
