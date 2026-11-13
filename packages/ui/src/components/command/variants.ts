import { cva } from "class-variance-authority"

// Medusa UI command.tsx (MIT). `[&>code]:code-body` theme.css'te yok; çıkarıldı.
export const commandVariants = cva([
  "flex items-center rounded-lg bg-contrast-bg-base px-4 py-1.5 shadow-elevation-code-block",
  "[&>code]:mx-2 [&>code]:text-primary-foreground",
])
