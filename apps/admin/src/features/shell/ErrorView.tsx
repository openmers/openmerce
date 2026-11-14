import { Alert, Button } from "@openmers/ui"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { toApiError } from "../../lib/apiError"

/** Route error boundary: shows the mapped message only; raw server text never reaches the UI. */
export function ErrorView({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-start gap-3 p-6">
      <Alert variant="error">{toApiError(error).message}</Alert>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
