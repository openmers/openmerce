import { MalformedResponseError, ORPCError } from "@orpc/client"
import { describe, expect, it } from "vitest"
import { toApiError } from "./apiError"
import { safeRedirect } from "./session"

describe("toApiError", () => {
  it("maps contract codes to their message", () => {
    expect(toApiError(new ORPCError("CONFLICT"))).toEqual({
      code: "CONFLICT",
      message: "The record was changed by someone else. Reload and try again.",
    })
  })

  it("maps transport codes and hides unknown ones as INTERNAL", () => {
    expect(toApiError(new ORPCError("BAD_REQUEST")).code).toBe("INVALID_INPUT")
    expect(toApiError(new ORPCError("SOMETHING_ELSE")).code).toBe("INTERNAL")
    expect(toApiError(new Error("boom")).code).toBe("INTERNAL")
  })

  it("reads the code of shell-level JSON errors and treats fetch failures as NETWORK", () => {
    const shell = new MalformedResponseError({
      response: { status: 404, headers: {}, body: { ok: false, code: "CHANNEL_UNKNOWN" } },
    })
    expect(toApiError(shell).code).toBe("CHANNEL_UNKNOWN")
    expect(toApiError(new TypeError("Failed to fetch")).code).toBe("NETWORK")
  })
})

describe("safeRedirect", () => {
  it("follows only same-app paths", () => {
    expect(safeRedirect("/orders?x=1")).toBe("/orders?x=1")
    expect(safeRedirect("//evil.example")).toBe("/")
    expect(safeRedirect("https://evil.example")).toBe("/")
    expect(safeRedirect(undefined)).toBe("/")
  })
})
