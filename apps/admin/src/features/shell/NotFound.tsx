import { Button, Heading, Text } from "@openmers/ui"
import { useNavigate } from "@tanstack/react-router"

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
      <Heading level="h2">Page not found</Heading>
      <Text className="text-muted-foreground">The page you are looking for does not exist.</Text>
      <Button variant="secondary" onClick={() => navigate({ to: "/" })}>
        Go home
      </Button>
    </div>
  )
}
