import "./style.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { createAppRouter, createQueryClient } from "./router"

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)
const root = document.getElementById("app")
if (!root) throw new Error("missing #app element")

createRoot(root).render(
  <StrictMode>
    <App queryClient={queryClient} router={router} />
  </StrictMode>,
)
