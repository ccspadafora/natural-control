import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import { createNcQueryClient } from "@nc/api"
import { registerSW } from "virtual:pwa-register"
import { App } from "./App"

const queryClient = createNcQueryClient()

registerSW({ immediate: true })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/campo">
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
