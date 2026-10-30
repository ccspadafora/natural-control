import { test, expect } from "@playwright/test"

/**
 * Assertions de inventario (plan §3) — se activan con PARITY_FULL=1
 * cuando el stack corre con seed_prototipo y fecha congelada.
 */
const full = !!process.env.PARITY_FULL

test.describe("inventario portal — humo de rutas", () => {
  test.skip(!full, "Activa PARITY_FULL=1 con API + seed prototipo")

  const routes = [
    { path: "/portal/login", text: /Entra al CRM de campo/i },
    { path: "/consola/login", text: /Entra al CRM de campo/i },
  ]

  for (const r of routes) {
    test(`login visible en ${r.path}`, async ({ page }) => {
      await page.goto(r.path)
      await expect(page.getByRole("heading", { name: r.text })).toBeVisible()
    })
  }
})

test.describe("inventario campo — humo", () => {
  test.skip(!full, "Activa PARITY_FULL=1 con API + seed prototipo")

  test("login Campo", async ({ page }) => {
    await page.goto("/campo/login")
    await expect(page.getByRole("heading", { name: /Entra al CRM de campo/i })).toBeVisible()
  })
})
