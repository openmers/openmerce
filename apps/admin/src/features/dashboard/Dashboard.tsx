import { Container, Heading, Text } from "@openmers/ui"
import { useQuery } from "@tanstack/react-query"
import { meQuery } from "../../lib/session"

// Placeholder: dashboard widgets come later (daily summary endpoint).
export function Dashboard() {
  const { data } = useQuery(meQuery())
  return (
    <Container className="flex flex-col gap-2">
      <Heading level="h1">Dashboard</Heading>
      <Text className="text-muted-foreground">Welcome, {data?.admin.name}</Text>
    </Container>
  )
}
