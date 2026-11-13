import { render, screen, waitFor, within } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import DataTableExample from "./fixtures/DataTableExample.svelte"

const menu = () => document.querySelector<HTMLElement>("[data-dropdown-menu-content]")
const popover = () => document.querySelector<HTMLElement>("[data-popover-content]")

async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name }))
  await waitFor(() => expect(menu()).not.toBeNull())
}

describe("DataTable", () => {
  it("renders headers, rows and the select/action columns", () => {
    render(DataTableExample)

    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /Name/ })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Sneaker" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Boot" })).toBeInTheDocument()
    expect(screen.getAllByRole("checkbox")).toHaveLength(4)
  })

  it("reports controlled sorting changes on header click", async () => {
    const user = userEvent.setup()
    const onSortingChange = vi.fn()
    render(DataTableExample, { props: { onSortingChange } })

    await user.click(screen.getByRole("button", { name: "Name" }))
    expect(onSortingChange).toHaveBeenLastCalledWith({ id: "name", desc: false })

    await user.click(screen.getByRole("button", { name: "Name" }))
    expect(onSortingChange).toHaveBeenLastCalledWith({ id: "name", desc: true })
  })

  it("adds and removes a filter through the filter menu and bar", async () => {
    const user = userEvent.setup()
    const onFilteringChange = vi.fn()
    render(DataTableExample, { props: { onFilteringChange } })

    await openMenu(user, "Filters")
    await user.click(within(menu() as HTMLElement).getByText("Status"))
    expect(onFilteringChange).toHaveBeenLastCalledWith({ status: [] })

    await waitFor(() => expect(popover()).not.toBeNull())
    await user.click(within(popover() as HTMLElement).getByText("Active"))
    expect(onFilteringChange).toHaveBeenLastCalledWith({ status: ["active"] })

    await user.click(screen.getByRole("button", { name: "Remove Status filter" }))
    expect(onFilteringChange).toHaveBeenLastCalledWith({})
  })

  it("does not remove a new filter while a value is being picked", async () => {
    const user = userEvent.setup()
    const onFilteringChange = vi.fn()
    render(DataTableExample, { props: { onFilteringChange } })

    await openMenu(user, "Filters")
    await user.click(within(menu() as HTMLElement).getByText("Featured"))

    await waitFor(() => expect(popover()).not.toBeNull())
    await user.click(screen.getByText("True", { selector: "span" }))
    expect(onFilteringChange).toHaveBeenLastCalledWith({ featured: true })
  })

  it("selects a row, shows the command bar and runs the command", async () => {
    const user = userEvent.setup()
    const onRowSelectionChange = vi.fn()
    const onCommand = vi.fn()
    render(DataTableExample, { props: { onRowSelectionChange, onCommand } })

    await user.click(screen.getAllByRole("checkbox")[1])
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ "1": true })

    await waitFor(() => expect(screen.getByText("1 selected")).toBeInTheDocument())
    await user.click(
      within(
        screen.getByText("1 selected").closest("[data-popover-content]") as HTMLElement,
      ).getByText("Delete"),
    )
    expect(onCommand).toHaveBeenCalledWith(["1"])
  })

  it("registers the command shortcut only while rows are selected", async () => {
    const user = userEvent.setup()
    const onCommand = vi.fn()
    render(DataTableExample, { props: { onCommand } })

    await user.keyboard("d")
    expect(onCommand).not.toHaveBeenCalled()

    await user.click(screen.getAllByRole("checkbox")[1])
    await user.keyboard("d")
    expect(onCommand).toHaveBeenCalledWith(["1"])
  })

  it("calls onRowClick with the original row data", async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(DataTableExample, { props: { onRowClick } })

    await user.click(screen.getByText("Sneaker"))
    expect(onRowClick).toHaveBeenCalledOnce()
    expect(onRowClick.mock.calls[0][1]).toMatchObject({ id: "1", name: "Sneaker" })
  })

  it("reports search changes", async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    render(DataTableExample, { props: { onSearchChange } })

    await user.type(screen.getByRole("searchbox"), "boot")
    expect(onSearchChange).toHaveBeenLastCalledWith("boot")
  })

  it("shows the empty state when there is no data", () => {
    render(DataTableExample, { props: { data: [] } })

    expect(screen.getByText("No products")).toBeInTheDocument()
    expect(screen.getByText("Create your first product")).toBeInTheDocument()
  })

  it("shows the filtered empty state when search is active", () => {
    render(DataTableExample, { props: { data: [], initialSearch: "x" } })

    expect(screen.getByText("No results")).toBeInTheDocument()
    expect(screen.getByText("Try clearing filters")).toBeInTheDocument()
  })

  it("paginates with previous/next only when rowCount is unknown", async () => {
    const user = userEvent.setup()
    const onPaginationChange = vi.fn()
    render(DataTableExample, { props: { onPaginationChange } })

    expect(screen.queryByText(/results/)).toBeNull()
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(onPaginationChange).toHaveBeenLastCalledWith({ pageIndex: 1, pageSize: 2 })
    await waitFor(() => expect(screen.getByRole("button", { name: "Prev" })).toBeEnabled())
  })

  it("shows the total when rowCount is provided", () => {
    render(DataTableExample, { props: { rowCount: 10 } })

    expect(screen.getByText(/of 10 results/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Prev" })).toBeDisabled()
  })

  it("applies a date preset filter", async () => {
    const user = userEvent.setup()
    const onFilteringChange = vi.fn()
    render(DataTableExample, { props: { onFilteringChange } })

    await openMenu(user, "Filters")
    await user.click(within(menu() as HTMLElement).getByText("Created"))
    await waitFor(() => expect(popover()).not.toBeNull())
    await user.click(within(popover() as HTMLElement).getByText("Last week"))

    expect(onFilteringChange).toHaveBeenLastCalledWith({
      created: { $gte: "2026-01-01T00:00:00.000Z" },
    })
  })

  it("updates the boolean filter value", async () => {
    const user = userEvent.setup()
    const onFilteringChange = vi.fn()
    render(DataTableExample, { props: { onFilteringChange } })

    await openMenu(user, "Filters")
    await user.click(within(menu() as HTMLElement).getByText("Featured"))
    await waitFor(() => expect(popover()).not.toBeNull())
    await user.click(within(popover() as HTMLElement).getByText("False"))

    expect(onFilteringChange).toHaveBeenLastCalledWith({ featured: false })
  })
})
