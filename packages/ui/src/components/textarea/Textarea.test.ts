import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import Textarea from "./Textarea.svelte"

describe("Textarea", () => {
  it("renders a textbox with the shared field styles", () => {
    render(Textarea, { props: { "aria-label": "Note" } })

    const textarea = screen.getByRole("textbox", { name: "Note" })
    expect(textarea.tagName).toBe("TEXTAREA")
    expect(textarea).toHaveClass(
      "txt-small",
      "min-h-[60px]",
      "w-full",
      "px-2",
      "py-1.5",
      "shadow-borders-base",
      "bg-bg-field",
      "rounded-md",
    )
  })

  it("accepts typed text and forwards rows", async () => {
    const user = userEvent.setup()
    render(Textarea, { props: { "aria-label": "Note", rows: 4 } })

    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveAttribute("rows", "4")

    await user.type(textarea, "Gift wrap")
    expect(textarea).toHaveValue("Gift wrap")
  })

  it("passes rest props and merges a consumer class", () => {
    render(Textarea, {
      props: { placeholder: "Add a note", disabled: true, class: "min-h-24 custom-class" },
    })

    const textarea = screen.getByPlaceholderText("Add a note")
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveClass("min-h-24", "custom-class")
    expect(textarea).not.toHaveClass("min-h-[60px]")
  })
})
