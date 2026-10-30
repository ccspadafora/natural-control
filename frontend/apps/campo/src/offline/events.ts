type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeOutbox(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyOutbox() {
  listeners.forEach((listener) => listener())
}
