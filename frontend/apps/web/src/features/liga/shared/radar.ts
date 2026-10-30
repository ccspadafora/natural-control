/** Polígono radar hexagonal (prototipo Portal). */

export function radarPoints(vals: number[], cx: number, cy: number, radius: number): string {
  return vals
    .map((v, i) => {
      const angle = ((-90 + i * 60) * Math.PI) / 180
      const k = (typeof v === "number" ? v : 0) / 99 * radius
      return `${(cx + Math.cos(angle) * k).toFixed(1)},${(cy + Math.sin(angle) * k).toFixed(1)}`
    })
    .join(" ")
}

export const RADAR_AXES = [
  { k: "VEN", lx: 150, ly: 12 },
  { k: "CON", lx: 268, ly: 78 },
  { k: "ACT", lx: 268, ly: 202 },
  { k: "COB", lx: 150, ly: 268 },
  { k: "CNF", lx: 32, ly: 202 },
  { k: "DES", lx: 32, ly: 78 },
] as const

export function axisLine(i: number, cx: number, cy: number, r: number) {
  const angle = ((-90 + i * 60) * Math.PI) / 180
  return { x2: cx + Math.cos(angle) * r, y2: cy + Math.sin(angle) * r }
}

export const RADAR_RINGS = [1, 0.75, 0.5, 0.25].map((scale) =>
  radarPoints([99, 99, 99, 99, 99, 99].map((v) => v * scale), 150, 140, 110),
)
