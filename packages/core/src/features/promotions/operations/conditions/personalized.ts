import { z } from "zod"
import type { ConditionDef } from "../../types"

/** The cart has a personalized line (inverted with `required: false`: none at all). */
export const personalized: ConditionDef<{ required: boolean }> = {
  code: "personalized",
  args: z.object({ required: z.boolean().default(true) }),
  check: (args, view) => view.lines.some((l) => l.personalized === true) === args.required,
}
