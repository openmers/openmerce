import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Table from "./Table.svelte"
import TableBody from "./TableBody.svelte"
import TableCell from "./TableCell.svelte"
import TableHeader from "./TableHeader.svelte"
import TableHeaderCell from "./TableHeaderCell.svelte"
import TableRow from "./TableRow.svelte"

const tableMarkup = "<tbody><tr><td>#1001</td><td>Paid</td></tr></tbody>"

describe("Table", () => {
  it("renders a table with the base classes and its content", () => {
    render(Table, { props: { children: textSnippet(tableMarkup) } })

    const table = screen.getByRole("table")
    expect(table).toHaveClass("txt-compact-small", "w-full", "text-muted-foreground")
    expect(screen.getByRole("cell", { name: "#1001" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Paid" })).toBeInTheDocument()
  })

  it("passes rest props and merges a consumer class", () => {
    render(Table, {
      props: { "data-testid": "table", class: "table-fixed", children: textSnippet(tableMarkup) },
    })

    const table = screen.getByTestId("table")
    expect(table).toHaveClass("table-fixed", "w-full")
  })
})

describe("Table sections", () => {
  it("renders a body and a header with their classes", () => {
    const body = render(TableBody)
    expect(body.container.querySelector("tbody")).toHaveClass("border-b", "border-border")
    body.unmount()

    const header = render(TableHeader)
    expect(header.container.querySelector("thead")).toHaveClass(
      "txt-compact-small-plus",
      "border-y",
      "[&_tr]:bg-background",
    )
    expect(header.container.querySelector("thead")).toHaveClass("border-border")
  })

  it("renders a row with hover and edge padding classes", () => {
    const { container } = render(TableRow, {
      props: { children: textSnippet("<td>#1001</td>") },
    })

    const row = container.querySelector("tr")
    expect(row).toHaveClass("border-b", "border-border", "bg-card", "hover:bg-accent")
    expect(row).toHaveClass("[&_td:first-child]:pl-6", "[&_td:last-child]:pr-6")
  })

  it("renders a cell and a header cell with their classes", () => {
    const cell = render(TableCell, { props: { children: textSnippet("Order") } })
    expect(cell.container.querySelector("td")).toHaveClass("h-12", "py-0", "pl-0", "pr-6")
    cell.unmount()

    const headerCell = render(TableHeaderCell, { props: { children: textSnippet("Order") } })
    expect(headerCell.container.querySelector("th")).toHaveClass(
      "txt-compact-small-plus",
      "h-12",
      "text-left",
    )
  })

  it("merges consumer classes on each part", () => {
    const { container } = render(TableCell, {
      props: { class: "w-24 custom-class", children: textSnippet("Order") },
    })

    expect(container.querySelector("td")).toHaveClass("w-24", "custom-class")
  })
})
