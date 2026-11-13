import type { DataTableCommand } from "./types"

/** Returns the command definition as is; it exists only for type inference. */
export function createDataTableCommandHelper() {
  return {
    command: (command: DataTableCommand) => command,
  }
}
