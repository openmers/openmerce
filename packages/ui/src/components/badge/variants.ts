import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. Color classes come from the "Tailwind name" column of mapping.md.
export const badgeColorVariants = cva("", {
  variants: {
    color: {
      green:
        "bg-tag-green-bg text-tag-green-text [&_svg]:text-tag-green-icon border-tag-green-border",
      red: "bg-tag-red-bg text-tag-red-text [&_svg]:text-tag-red-icon border-tag-red-border",
      blue: "bg-tag-blue-bg text-tag-blue-text [&_svg]:text-tag-blue-icon border-tag-blue-border",
      orange:
        "bg-tag-orange-bg text-tag-orange-text [&_svg]:text-tag-orange-icon border-tag-orange-border",
      grey: "bg-tag-neutral-bg text-tag-neutral-text [&_svg]:text-tag-neutral-icon border-tag-neutral-border",
      purple:
        "bg-tag-purple-bg text-tag-purple-text [&_svg]:text-tag-purple-icon border-tag-purple-border",
    },
  },
  defaultVariants: {
    color: "grey",
  },
})

export const badgeSizeVariants = cva("inline-flex items-center gap-x-0.5 border box-border", {
  variants: {
    size: {
      "2xsmall": "txt-compact-xsmall-plus h-5",
      xsmall: "txt-compact-xsmall-plus py-px h-6",
      small: "txt-compact-xsmall-plus py-[3px] h-7",
      base: "txt-compact-small-plus py-[5px] h-8",
      large: "txt-compact-medium-plus py-[7px] h-10",
    },
    rounded: {
      base: "rounded-md",
      full: "rounded-full",
    },
  },
  compoundVariants: [
    { size: "2xsmall", rounded: "full", className: "px-1.5" },
    { size: "2xsmall", rounded: "base", className: "px-1" },
    { size: "xsmall", rounded: "full", className: "px-2" },
    { size: "xsmall", rounded: "base", className: "px-1.5" },
    { size: "small", rounded: "full", className: "px-2.5" },
    { size: "small", rounded: "base", className: "px-2" },
    { size: "base", rounded: "full", className: "px-3" },
    { size: "base", rounded: "base", className: "px-2.5" },
    { size: "large", rounded: "full", className: "px-3.5" },
    { size: "large", rounded: "base", className: "px-3" },
  ],
  defaultVariants: {
    size: "base",
    rounded: "base",
  },
})

export type BadgeColorVariants = VariantProps<typeof badgeColorVariants>
export type BadgeSizeVariants = VariantProps<typeof badgeSizeVariants>
