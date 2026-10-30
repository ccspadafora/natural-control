let accessToken = ""

export function access() {
  return accessToken
}

export function setAccessToken(token: string) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = ""
}

async function parse(response: Response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || "No se pudo completar la acción.")
  }
  return data
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("X-Requested-With", "nc")
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  return parse(await fetch(path, { ...init, credentials: "include", headers }))
}

export { parse }
