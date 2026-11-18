import { test, expect } from "@playwright/test"
import { loginCampo, loginPortal } from "./helpers"

/**
 * Assertions de inventario (plan §3) — se activan con PARITY_FULL=1
 * cuando el stack corre con seed_prototipo y fecha congelada.
 */
const full = !!process.env.PARITY_FULL

test.describe("inventario — logins", () => {
  test.skip(!full, "Activa PARITY_FULL=1 con API + seed prototipo")

  const routes = [
    { path: "/portal/login", text: /Entra al CRM de campo/i },
    { path: "/consola/login", text: /Entra al CRM de campo/i },
    { path: "/campo/login", text: /Entra al CRM de campo/i },
  ]

  for (const r of routes) {
    test(`login visible en ${r.path}`, async ({ page }) => {
      await page.goto(r.path)
      await expect(page.getByRole("heading", { name: r.text })).toBeVisible()
    })
  }
})

test.describe("inventario portal RTC", () => {
  test.skip(!full, "Activa PARITY_FULL=1 con API + seed prototipo")

  const routes: { path: string; heading: RegExp }[] = [
    { path: "/portal", heading: /Buenos días|Buenas tardes|Buenas noches|Hola/i },
    { path: "/portal/clientes", heading: /Tu cartera/i },
    { path: "/portal/micarta", heading: /Mi carta y liga/i },
    { path: "/portal/forecast", heading: /Mi forecast/i },
  ]

  for (const r of routes) {
    test(`RTC ve ${r.path}`, async ({ page }) => {
      await loginPortal(page, "rtc@naturalcontrol.test", "/portal/login")
      await page.goto(r.path)
      await expect(page.getByRole("heading", { name: r.heading }).first()).toBeVisible({ timeout: 15_000 })
    })
  }
})

test.describe("inventario consola líder / gerencia / admin", () => {
  test.skip(!full, "Activa PARITY_FULL=1 con API + seed prototipo")

  test("Líder · geo e inicio", async ({ page }) => {
    await loginPortal(page, "lider@naturalcontrol.test", "/consola/login")
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole("link", { name: /Geo|discrepancia|GPS/i }).first().click()
    await expect(page.getByRole("heading", { name: /Discrepancias de GPS/i }).first()).toBeVisible({ timeout: 15_000 })
  })

  test("Gerencia · liga y forecast", async ({ page }) => {
    await loginPortal(page, "gerencia@naturalcontrol.test", "/consola/login")
    await page.getByRole("link", { name: /^Liga$/i }).click()
    await expect(page.getByRole("heading", { name: /Liga/i }).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole("link", { name: /Forecast|Pronóstico/i }).first().click()
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 })
  })

  test("Admin · salud", async ({ page }) => {
    await loginPortal(page, "admin@naturalcontrol.test", "/consola/login")
    await expect(page.getByRole("heading", { name: /Salud/i }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Correo|WhatsApp|backup|Colas/i).first()).toBeVisible()
  })
})

test.describe("inventario campo autenticado", () => {
  test.skip(!full, "Activa PARITY_FULL=1 con API + seed prototipo")

  test("Hoy / clientes", async ({ page }) => {
    await loginCampo(page)
    await expect(page.getByRole("heading", { name: /^Hoy$/i })).toBeVisible()
    await page.locator("nav[aria-label='Principal'] a").filter({ hasText: "Clientes" }).click()
    await expect(page.getByRole("heading", { name: /Mi cartera/i })).toBeVisible({ timeout: 15_000 })
  })
})
