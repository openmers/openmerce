import type { ReactNode } from "react"
import { Tooltip } from "../Tooltip"

export function TooltipCustomTrigger({ content }: { content: ReactNode }) {
  return (
    <Tooltip content={content} asChild>
      <a href="#hedef">Bağlantı</a>
    </Tooltip>
  )
}
