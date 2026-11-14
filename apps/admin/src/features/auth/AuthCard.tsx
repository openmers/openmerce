import { Alert, Button, Container, Heading, Input, Label } from "@openmers/ui"
import type { FormEvent, ReactNode } from "react"

type Field = { name: string; label: string; type: string; autoComplete: string }

/** Centered card with labelled fields; shared by login and first-run setup. */
export function AuthCard({
  title,
  fields,
  submitLabel,
  error,
  pending,
  onSubmit,
}: {
  title: string
  fields: Field[]
  submitLabel: string
  error?: ReactNode
  pending: boolean
  onSubmit: (values: Record<string, string>) => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit(Object.fromEntries(fields.map((f) => [f.name, String(data.get(f.name) ?? "")])))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Container className="flex w-full max-w-sm flex-col gap-4">
        <Heading level="h2">{title}</Heading>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                required
              />
            </div>
          ))}
          <Button type="submit" isLoading={pending} className="w-full">
            {submitLabel}
          </Button>
        </form>
      </Container>
    </div>
  )
}
