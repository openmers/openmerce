import { describe, expect, it } from "vitest"
import { tokens } from "./index"

describe("tokens", () => {
  const { light, dark } = tokens.colors

  it("has 90 colors with equal light and dark key sets", () => {
    expect(Object.keys(light)).toHaveLength(90)
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort())
  })

  it("has equal light and dark shadow key sets", () => {
    expect(Object.keys(tokens.shadows.light)).toHaveLength(23)
    expect(Object.keys(tokens.shadows.dark).sort()).toEqual(
      Object.keys(tokens.shadows.light).sort(),
    )
  })

  it("has no empty values", () => {
    const values = [
      ...Object.values(light),
      ...Object.values(dark),
      ...Object.values(tokens.shadows.light),
      ...Object.values(tokens.shadows.dark),
      ...Object.values(tokens.typography).flatMap(Object.values),
    ]
    for (const v of values) expect(v.trim()).not.toBe("")
  })

  it("aliases point at existing colors", () => {
    for (const target of Object.values(tokens.colorAliases)) expect(light).toHaveProperty(target)
  })
})
