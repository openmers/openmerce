import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { me, mockApi, unauthenticated } from "../../test/http"
import { renderApp } from "../../test/renderApp"

afterEach(() => vi.unstubAllGlobals())

describe("admin auth flow", () => {
  it("redirects an unauthenticated visit to login and keeps the target", async () => {
    mockApi({ "admin.me": unauthenticated })
    const { router } = renderApp("/orders")

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/login")
    expect(router.state.location.search).toEqual({ redirect: "/orders" })
  })

  it("signs in, reloads the session and lands on the dashboard", async () => {
    let signedIn = false
    const api = mockApi({
      "admin.me": () => (signedIn ? me([])() : unauthenticated()),
      "admin.auth.login": () => {
        signedIn = true
        return { ok: true }
      },
    })
    const user = userEvent.setup()
    const { router } = renderApp("/")

    await user.type(await screen.findByLabelText("Email"), "ada@example.com")
    await user.type(screen.getByLabelText("Password"), "correct-horse")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    expect(api.callsTo("admin.auth.login")[0]).toMatchObject({
      input: { email: "ada@example.com", password: "correct-horse" },
      credentials: "include",
    })
  })

  it("shows the mapped message when login fails", async () => {
    mockApi({ "admin.me": unauthenticated, "admin.auth.login": unauthenticated })
    const user = userEvent.setup()
    renderApp("/login")

    await user.type(await screen.findByLabelText("Email"), "ada@example.com")
    await user.type(screen.getByLabelText("Password"), "wrong-password")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(
      await screen.findByText("Your session has ended or the credentials are wrong."),
    ).toBeInTheDocument()
  })
})
