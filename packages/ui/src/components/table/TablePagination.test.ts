import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import TablePagination from "./TablePagination.svelte"

const baseProps = {
  count: 10,
  pageSize: 5,
  pageIndex: 0,
  pageCount: 2,
  canPreviousPage: false,
  canNextPage: true,
  previousPage: () => {},
  nextPage: () => {},
}

describe("TablePagination", () => {
  it("renders the visible range and page count", () => {
    render(TablePagination, { props: baseProps })

    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("5 of 10 results")).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 pages/)).toBeInTheDocument()
  })

  it("disables previous and enables next on the first page", () => {
    render(TablePagination, { props: baseProps })

    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled()
  })

  it("calls nextPage and previousPage", async () => {
    const user = userEvent.setup()
    const nextPage = vi.fn()
    const previousPage = vi.fn()
    render(TablePagination, {
      props: {
        ...baseProps,
        pageIndex: 1,
        canPreviousPage: true,
        canNextPage: false,
        nextPage,
        previousPage,
      },
    })

    await user.click(screen.getByRole("button", { name: "Prev" }))
    await user.click(screen.getByRole("button", { name: "Next" }))

    expect(previousPage).toHaveBeenCalledOnce()
    expect(nextPage).not.toHaveBeenCalled()
  })

  it("renders custom translations and zero-count ranges", () => {
    render(TablePagination, {
      props: {
        ...baseProps,
        count: 0,
        pageCount: 0,
        canNextPage: false,
        translations: {
          of: "/",
          results: "kayıt",
          pages: "sayfa",
          prev: "Önceki",
          next: "Sonraki",
        },
      },
    })

    expect(screen.getByText("0 / 0 kayıt")).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 1 sayfa/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Önceki" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sonraki" })).toBeInTheDocument()
  })

  it("merges a consumer class", () => {
    const { container } = render(TablePagination, {
      props: { ...baseProps, class: "bg-card custom-class" },
    })

    expect(container.firstElementChild).toHaveClass("bg-card", "custom-class")
  })
})
