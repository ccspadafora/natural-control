import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button } from "./components/core/Button"

describe("Button", () => {
  it("renderiza con variante primaria", () => {
    render(<Button>Guardar</Button>)
    const btn = screen.getByRole("button", { name: "Guardar" })
    expect(btn.className).toContain("nc-btn-primary")
  })

  it("admite variante outline", () => {
    render(
      <Button variant="outline" block>
        Continuar
      </Button>,
    )
    const btn = screen.getByRole("button", { name: "Continuar" })
    expect(btn.className).toContain("nc-btn-outline")
    expect(btn.className).toContain("nc-btn-block")
  })
})
