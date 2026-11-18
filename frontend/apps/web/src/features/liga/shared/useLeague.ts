import { useCallback, useEffect, useState } from "react"
import { api } from "@nc/api"
import type { LeagueBoard, ScorecardDetail } from "./leagueTypes"

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

export function useLeagueBoard(zone = "all") {
  const q = zone && zone !== "all" ? `?zone=${encodeURIComponent(zone)}` : ""
  return useFetch<LeagueBoard>(`/api/v1/league${q}`)
}

export function useScorecard(userId: string | null) {
  return useFetch<ScorecardDetail>(userId ? `/api/v1/league/scorecards/${userId}` : null)
}
