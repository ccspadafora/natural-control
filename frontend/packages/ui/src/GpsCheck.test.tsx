import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GpsCheck } from "./components/gps/GpsCheck"

describe("GpsCheck", () => {
  it("muestra Discrepancia fuera de rango", () => {
    render(<GpsCheck status="FUERA_DE_RANGO" distanceM={120} />)
    expect(screen.getByText(/Discrepancia/)).toBeInTheDocument()
    expect(screen.queryByText(/fraude/i)).toBeNull()
  })

  it("muestra verificada con distancia", () => {
    render(<GpsCheck status="VERIFICADA" distanceM={45} />)
    expect(screen.getByText(/Verificada/)).toBeInTheDocument()
    expect(screen.getByText(/45 m/)).toBeInTheDocument()
  })
})
