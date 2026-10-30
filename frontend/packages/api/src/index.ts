import type { SessionUser } from "@nc/domain"
import { access, api, clearAccessToken, parse, setAccessToken } from "./client"

export { access, api } from "./client"
export { createNcQueryClient } from "./query-client"
export { isDemoMode } from "./demo"

export async function login(identifier: string, password: string, remember = true): Promise<SessionUser> {
  const data = await parse(
    await fetch("/api/v1/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Requested-With": "nc" },
      body: JSON.stringify({ identifier, password, remember }),
    }),
  )
  setAccessToken(data.access)
  return data.user
}

export async function restore(): Promise<SessionUser | null> {
  const refreshed = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: { "X-Requested-With": "nc" },
  })
  if (!refreshed.ok) return null
  const data = await refreshed.json()
  setAccessToken(data.access)
  const me = await fetch("/api/v1/auth/me", {
    credentials: "include",
    headers: { Authorization: `Bearer ${data.access}`, "X-Requested-With": "nc" },
  })
  if (!me.ok) return null
  return me.json()
}

export async function logout() {
  await fetch("/api/v1/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "X-Requested-With": "nc" },
  })
  clearAccessToken()
}

export async function verifyCode(identifier: string, code: string): Promise<SessionUser> {
  const data = await parse(
    await fetch("/api/v1/auth/otp/verify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Requested-With": "nc" },
      body: JSON.stringify({ identifier, code }),
    }),
  )
  setAccessToken(data.access)
  return data.user
}

export function openStream(onEvent: (message: { type: string; data?: Record<string, unknown> }) => void) {
  const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/v1/stream`)
  socket.onopen = () => socket.send(JSON.stringify({ type: "auth", token: access() }))
  socket.onmessage = (event) => {
    try {
      onEvent(JSON.parse(event.data))
    } catch {
      /* ignore malformed frames */
    }
  }
  return () => socket.close()
}

export async function resetPassword(identifier: string, code: string, newPassword: string) {
  await parse(
    await fetch("/api/v1/auth/password/reset", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Requested-With": "nc" },
      body: JSON.stringify({ identifier, code, new_password: newPassword }),
    }),
  )
}

export async function requestCode(identifier: string, purpose: "LOGIN" | "PASSWORD_RESET") {
  const response = await fetch("/api/v1/auth/otp/request", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-Requested-With": "nc" },
    body: JSON.stringify({ identifier, purpose }),
  })
  if (response.status !== 202) {
    throw new Error("No se pudo enviar el código.")
  }
}
