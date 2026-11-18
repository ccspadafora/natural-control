import { expect, type Page } from "@playwright/test"

const PASSWORD = "Nc-Campo-2026-piloto"

/** Login por formulario (cookie HttpOnly Path=/api/v1/auth/). */
export async function loginAs(page: Page, email: string, loginPath: string, afterPath: string) {
  await page.goto(loginPath)
  await page.getByLabel(/correo|usuario/i).fill(email)
  await page.getByLabel(/contraseña|clave/i).fill(PASSWORD)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "Iniciar sesión" }).click(),
  ])
  if (!page.url().includes(afterPath.replace(/\/$/, ""))) {
    await page.goto(afterPath)
  }
  await expect(page.getByRole("heading", { name: /Entra al CRM de campo/i })).toHaveCount(0, {
    timeout: 10_000,
  })
}

export async function loginPortal(page: Page, email: string, _loginPath = "/portal/login") {
  const after =
    email.startsWith("rtc@") ? "/portal" : email.startsWith("admin@") ? "/consola/salud" : "/consola"
  const path = email.startsWith("rtc@") ? "/portal/login" : "/consola/login"
  await loginAs(page, email, path, after)
}

export async function loginCampo(page: Page, email = "rtc@naturalcontrol.test") {
  await loginAs(page, email, "/campo/login", "/campo/")
}
