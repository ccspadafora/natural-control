import { describe, expect, it } from "vitest"
import { Format } from "./format"

describe("Format", () => {
  it("formatea dinero COP", () => {
    expect(Format.money(1250000)).toBe("$ 1.250.000")
  })

  it("formatea porcentaje", () => {
    expect(Format.percent(87.4)).toBe("87 %")
  })

  it("formatea fecha relativa en español", () => {
    const now = new Date("2026-10-30T12:00:00")
    const yesterday = new Date("2026-10-29T12:00:00")
    const label = Format.relativeDate(yesterday, now)
    expect(label.toLowerCase()).toMatch(/ayer|día/)
  })
})
