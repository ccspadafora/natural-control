import { test, expect } from "@playwright/test"

test("login portal muestra la tarjeta de entrada", async ({ page }) => {
  await page.goto("/portal/login")
  await expect(page.getByRole("button", { name: /iniciar sesión|entrar/i })).toBeVisible()
})
