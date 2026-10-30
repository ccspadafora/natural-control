import { api } from "./client"

type OrvalRequest = {
  url: string
  method: string
  params?: Record<string, unknown>
  data?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
}

function withQuery(url: string, params?: Record<string, unknown>) {
  if (!params || Object.keys(params).length === 0) return url
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${url}?${qs}` : url
}

/** Mutator de Orval: reutiliza cookies, JWT y errores del cliente manual. */
export const ncFetch = <T>(config: OrvalRequest): Promise<T> => {
  const { method, data, signal, headers } = config
  const init: RequestInit = { method, signal, headers }
  if (data !== undefined) {
    init.body = data instanceof FormData ? data : JSON.stringify(data)
  }
  return api<T>(withQuery(config.url, config.params), init)
}
