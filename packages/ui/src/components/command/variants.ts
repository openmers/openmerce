import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. `[&>code]:code-body` is absent from theme.css; it was dropped.
export const commandVariants = cva([
  "flex items-center rounded-lg bg-contrast-bg-base px-4 py-1.5 shadow-elevation-code-block",
  "[&>code]:mx-2 [&>code]:text-primary-foreground",
])
