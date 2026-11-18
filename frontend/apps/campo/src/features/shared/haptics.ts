export function haptic(kind: "light" | "success" | "warn" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return
  const pattern = kind === "success" ? [12, 40, 12] : kind === "warn" ? [24, 40, 24] : [10]
  try {
    navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
