import { test, expect } from "@playwright/test"

/**
 * Paridad visual: se completa en la fase 10.
 * Placeholder asegura que `make parity` tenga un proyecto ejecutable.
 */
test.describe("paridad portal", () => {
  test.skip(!process.env.PARITY_FULL, "Activa PARITY_FULL=1 cuando el seed prototipo y el rediseño estén listos")

  test("login oscuro 1440px", async ({ page }) => {
    await page.goto("/portal/login")
    await expect(page).toHaveScreenshot("login-dark.png", { maxDiffPixelRatio: 0.02 })
  })
})
