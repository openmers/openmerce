import { z } from "zod"
import type { ConditionDef } from "../../types"

/** Sepette kişiselleştirilmiş satır var (`required: false` ile tersi: hiç yok). */
export const personalized: ConditionDef<{ required: boolean }> = {
  code: "personalized",
  args: z.object({ required: z.boolean().default(true) }),
  check: (args, view) => view.lines.some((l) => l.personalized === true) === args.required,
}
