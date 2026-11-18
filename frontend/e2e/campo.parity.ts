import { test, expect } from "@playwright/test"
import { loginCampo } from "./helpers"

const full = !!process.env.PARITY_FULL

test.describe("paridad campo", () => {
  test.skip(!full, "Activa PARITY_FULL=1 con API + seed prototipo")

  test("Hoy muestra agenda tras login RTC", async ({ page }) => {
    await loginCampo(page)
    await expect(page.getByRole("heading", { name: /^Hoy$/i })).toBeVisible()
    await expect(page.getByText(/visitas/i).first()).toBeVisible()
  })

  test("Cartera y ficha cargan", async ({ page }) => {
    await loginCampo(page)
    await page.getByRole("link", { name: /clientes|cartera/i }).first().click()
    await expect(page.getByRole("heading", { name: /Mi cartera/i })).toBeVisible({ timeout: 15_000 })
    const row = page.locator("a[href*='clientes/']").first()
    if (await row.count()) {
      await row.click()
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 })
    }
  })

  test("Yo muestra carta con GEN de API", async ({ page }) => {
    await loginCampo(page)
    await page.locator("nav[aria-label='Principal'] a").filter({ hasText: "Yo" }).click()
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/VEN|Oro|Élite|Plata|Bronce|evaluación|Forma/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
