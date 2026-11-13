import type { DataTableCommand } from "./types"

/** Komut tanımını olduğu gibi döndürür; yalnız tip çıkarımı için vardır. */
export function createDataTableCommandHelper() {
  return {
    command: (command: DataTableCommand) => command,
  }
}
