import { useCallback, useEffect, useRef, useState } from "react"
import { access, api, openStream } from "@nc/api"
import type { Forecast, LiveVisits, Period, TeamMetrics, ZoneMetric } from "./metrics"

function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(Boolean(path))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let alive = true
    setLoading(true)
    api<T>(path)
      .then((res) => {
        if (!alive) return
        setData(res)
        setError("")
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "No se pudo cargar")
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [path, tick])

  const reload = useCallback(() => setTick((n) => n + 1), [])
  return { data, error, loading, reload }
}

export function useTeamMetrics(period: Period = "mes") {
  return useFetch<TeamMetrics>(`/api/v1/metrics/team?period=${period}`)
}

export function useZoneMetrics() {
  const { data, error, loading } = useFetch<{ results: ZoneMetric[] }>("/api/v1/metrics/zones")
  return { zones: data?.results ?? [], error, loading }
}

export function useForecast(months = 4) {
  return useFetch<Forecast>(`/api/v1/forecast?months=${months}`)
}

export function useLiveVisits(date?: string) {
  const { data, error, loading, reload } = useFetch<LiveVisits>(`/api/v1/visits/live${date ? `?date=${date}` : ""}`)
  const timer = useRef<number>()

  useEffect(() => {
    const close = openStream((message) => {
      if (!message.type.startsWith("visit.") && message.type !== "gps.discrepancy") return
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(reload, 400)
    })
    return () => {
      window.clearTimeout(timer.current)
      close()
    }
  }, [reload])

  return { data, error, loading, reload }
}

export type ExportKind = "VISITS_XLSX" | "CLIENTS_XLSX" | "FORECAST_XLSX" | "LEAGUE_PDF"

type ExportJob = { id: string; status: "PENDING" | "DONE" | "FAILED" }

async function downloadExport(id: string) {
  const response = await fetch(`/api/v1/exports/${id}/download`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${access()}`, "X-Requested-With": "nc" },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || "No se pudo descargar el archivo.")
  }
  const disposition = response.headers.get("Content-Disposition") || ""
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1]
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement("a")
  link.href = url
  link.download = name ? decodeURIComponent(name) : "exportacion.xlsx"
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function useExport() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const start = useCallback(async (kind: ExportKind, filters: Record<string, unknown> = {}): Promise<boolean> => {
    setBusy(true)
    setError("")
    try {
      const job = await api<ExportJob>("/api/v1/exports", { method: "POST", body: JSON.stringify({ kind, filters }) })
      let status = job.status
      while (status === "PENDING") {
        await new Promise((resolve) => window.setTimeout(resolve, 2000))
        if (!alive.current) return false
        status = (await api<ExportJob>(`/api/v1/exports/${job.id}`)).status
      }
      if (status === "FAILED") throw new Error("No se pudo generar el archivo.")
      await downloadExport(job.id)
      return true
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : "No se pudo exportar.")
      return false
    } finally {
      if (alive.current) setBusy(false)
    }
  }, [])

  return { start, busy, error }
}
