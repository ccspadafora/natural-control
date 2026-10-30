import { useEffect, useState } from "react"
import { api, openStream } from "@nc/api"

export function useGeoPending(enabled: boolean) {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    if (!enabled) return
    function load() {
      api<{ pending: number }>("/api/v1/gps-checks")
        .then((data) => setPending(data.pending))
        .catch(() => setPending(0))
    }
    load()
    const stop = openStream((message) => {
      if (message.type === "gps.discrepancy" || message.type === "visit.closed") load()
    })
    const timer = window.setInterval(load, 30000)
    return () => {
      stop()
      window.clearInterval(timer)
    }
  }, [enabled])

  return pending
}
