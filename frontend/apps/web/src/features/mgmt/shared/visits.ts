import { useEffect, useState } from "react"
import { api } from "@nc/api"

export type MgmtVisitRow = {
  id: string
  client_name: string
  municipality: string
  rtc_id: string
  rtc_name: string
  status: string
  origin: string
  priority: string
  reason: string
  scheduled_start: string | null
}

export function useMgmtVisits() {
  const [rows, setRows] = useState<MgmtVisitRow[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api<{ results: MgmtVisitRow[] }>("/api/v1/visits")
      .then((data) => {
        if (alive) setRows(data.results)
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
  }, [])

  return { rows, error, loading }
}

export function useRtcUsers() {
  const [rows, setRows] = useState<{ id: string; first_name: string; last_name: string; zone_name: string }[]>([])

  useEffect(() => {
    api<{ results: { id: string; first_name: string; last_name: string; zone_name: string }[] }>(
      "/api/v1/users?role=RTC&active=1",
    ).then((data) => setRows(data.results))
  }, [])

  return rows
}

export function useClientCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    api<{ results: unknown[] }>("/api/v1/clients")
      .then((data) => setCount(data.results.length))
      .catch(() => setCount(null))
  }, [])

  return count
}

/** Posición estable en el mapa stub (0–100 %). */
export function visitPinPosition(id: string, index: number) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const left = 12 + (h % 76)
  const top = 14 + ((h >> 8) % 62) + (index % 5) * 3
  return { left: `${left}%`, top: `${top}%` }
}
