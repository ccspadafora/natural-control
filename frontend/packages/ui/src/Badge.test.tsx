import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Badge } from "./components/core/Badge"

describe("Badge", () => {
  it("muestra el texto en mayúsculas de estilo", () => {
    render(<Badge tone="success">Realizada</Badge>)
    expect(screen.getByText("Realizada")).toBeInTheDocument()
    expect(screen.getByText("Realizada").className).toContain("nc-badge-success")
  })
})
