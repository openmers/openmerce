import { createFileRoute } from "@tanstack/react-router"
import { SetupForm } from "../features/auth/SetupForm"

export const Route = createFileRoute("/setup")({ component: SetupForm })
