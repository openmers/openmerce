import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "./Table"

const tableMarkup = (
  <tbody>
    <tr>
      <td>#1001</td>
      <td>Paid</td>
    </tr>
  </tbody>
)

// Table parts are rendered inside the elements the HTML parser requires around them.
const inTable = (section: ReactNode) => <table>{section}</table>
const inRow = (cell: ReactNode) =>
  inTable(
    <tbody>
      <tr>{cell}</tr>
    </tbody>,
  )

describe("Table", () => {
  it("renders a table with the base classes and its content", () => {
    render(<Table>{tableMarkup}</Table>)

    const table = screen.getByRole("table")
    expect(table).toHaveClass("txt-compact-small", "w-full", "text-muted-foreground")
    expect(screen.getByRole("cell", { name: "#1001" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Paid" })).toBeInTheDocument()
  })

  it("passes rest props and merges a consumer class", () => {
    render(
      <Table data-testid="table" className="table-fixed">
        {tableMarkup}
      </Table>,
    )

    const table = screen.getByTestId("table")
    expect(table).toHaveClass("table-fixed", "w-full")
  })
})

describe("Table sections", () => {
  it("renders a body and a header with their classes", () => {
    const body = render(inTable(<TableBody />))
    expect(body.container.querySelector("tbody")).toHaveClass("border-b", "border-border")
    body.unmount()

    const header = render(inTable(<TableHeader />))
    expect(header.container.querySelector("thead")).toHaveClass(
      "txt-compact-small-plus",
      "border-y",
      "[&_tr]:bg-background",
    )
    expect(header.container.querySelector("thead")).toHaveClass("border-border")
  })

  it("renders a row with hover and edge padding classes", () => {
    const { container } = render(
      inTable(
        <tbody>
          <TableRow>
            <td>#1001</td>
          </TableRow>
        </tbody>,
      ),
    )

    const row = container.querySelector("tr")
    expect(row).toHaveClass("border-b", "border-border", "bg-card", "hover:bg-accent")
    expect(row).toHaveClass("[&_td:first-child]:pl-6", "[&_td:last-child]:pr-6")
  })

  it("renders a cell and a header cell with their classes", () => {
    const cell = render(inRow(<TableCell>Order</TableCell>))
    expect(cell.container.querySelector("td")).toHaveClass("h-12", "py-0", "pl-0", "pr-6")
    cell.unmount()

    const headerCell = render(inRow(<TableHeaderCell>Order</TableHeaderCell>))
    expect(headerCell.container.querySelector("th")).toHaveClass(
      "txt-compact-small-plus",
      "h-12",
      "text-left",
    )
  })

  it("merges consumer classes on each part", () => {
    const { container } = render(inRow(<TableCell className="w-24 custom-class">Order</TableCell>))

    expect(container.querySelector("td")).toHaveClass("w-24", "custom-class")
  })
})
