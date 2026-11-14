import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Avatar } from "./Avatar"

describe("Avatar", () => {
  it("renders the fallback when no image is given", () => {
    render(<Avatar fallback="FK" />)

    const fallback = screen.getByText("FK")
    expect(fallback.tagName).toBe("SPAN")
    expect(fallback).toHaveClass("bg-bg-component-hover", "text-muted-foreground", "size-7")
    expect(fallback.parentElement).toHaveClass("bg-card", "h-8", "w-8", "rounded-full")
  })

  it("renders the image when a src is given", () => {
    render(<Avatar src="https://example.com/a.png" fallback="FK" />)

    const image = screen.getByRole("presentation", { hidden: true })
    expect(image.tagName).toBe("IMG")
    expect(image).toHaveAttribute("src", "https://example.com/a.png")
    expect(screen.queryByText("FK")).not.toBeInTheDocument()
  })

  it("falls back after the image fails to load", () => {
    render(<Avatar src="https://example.com/broken.png" fallback="FK" />)

    fireEvent.error(screen.getByRole("presentation", { hidden: true }))

    expect(screen.getByText("FK")).toBeInTheDocument()
  })

  it.each([
    ["rounded", "rounded-full"],
    ["squared", "rounded-md"],
  ] as const)("applies the %s variant classes", (variant, className) => {
    render(<Avatar variant={variant} fallback="FK" />)

    expect(screen.getByText("FK").parentElement).toHaveClass(className)
  })

  it.each([
    ["2xsmall", ["h-5", "w-5"]],
    ["xsmall", ["h-6", "w-6"]],
    ["small", ["h-7", "w-7"]],
    ["base", ["h-8", "w-8"]],
    ["large", ["h-10", "w-10"]],
    ["xlarge", ["h-12", "w-12"]],
  ] as const)("applies the %s size classes", (size, classes) => {
    render(<Avatar size={size} fallback="FK" />)

    expect(screen.getByText("FK").parentElement).toHaveClass(...classes)
  })

  it("passes rest props and merges a consumer class", () => {
    render(<Avatar fallback="FK" data-testid="avatar" className="ring-2 custom-class" />)

    const avatar = screen.getByTestId("avatar")
    expect(avatar).toHaveClass("ring-2", "custom-class", "bg-card")
  })
})
