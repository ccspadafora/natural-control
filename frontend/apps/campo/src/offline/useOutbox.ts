import { useCallback, useEffect, useState } from "react"
import { subscribeOutbox } from "./events"
import { countPending, flushOutbox, isFlushingOutbox, isOfflineMode } from "./outbox"

export function useOutbox() {
  const [pending, setPending] = useState(0)
  const [offline, setOffline] = useState(isOfflineMode())
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setPending(await countPending())
    setSyncing(isFlushingOutbox())
  }, [])

  useEffect(() => {
    void refresh()
    return subscribeOutbox(() => {
      void refresh()
    })
  }, [refresh])

  useEffect(() => {
    const syncOnline = () => setOffline(isOfflineMode())
    window.addEventListener("online", syncOnline)
    window.addEventListener("offline", syncOnline)
    return () => {
      window.removeEventListener("online", syncOnline)
      window.removeEventListener("offline", syncOnline)
    }
  }, [])

  const syncNow = useCallback(async () => {
    setSyncing(true)
    try {
      await flushOutbox()
    } finally {
      setSyncing(isFlushingOutbox())
      setPending(await countPending())
    }
  }, [])

  return { pending, offline, syncing, syncNow, refresh }
}
