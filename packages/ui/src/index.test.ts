import { describe, expect, it } from "vitest"
import * as ui from "./index"

describe("@openmers/ui public API", () => {
  it("exports components, hooks and utilities from one entry", () => {
    for (const name of ["Button", "Badge", "Select", "Tabs", "Prompt", "Toaster", "cn", "toast"]) {
      expect(ui, name).toHaveProperty(name)
    }
  })
})
