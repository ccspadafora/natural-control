const nf0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const grp = (n: number) => nf0.format(Math.round(n)).replace(/\u00a0|,/g, ".")

const rtf = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" })

/** Formatos del dominio: dinero COP, distancia, porcentaje, fechas relativas. */
export const Format = {
  money: (n: number) => "$ " + grp(n),
  number: (n: number) => grp(n),
  distance: (m: number) =>
    m < 1000 ? "a " + Math.round(m) + " m" : "a " + nf1.format(m / 1000).replace(".", ",") + " km",
  percent: (n: number) => Math.round(n) + " %",
  hectares: (n: number) => nf1.format(n).replace(".", ",").replace(/,0$/, "") + " ha",
  relativeDate: (date: Date, now: Date = new Date()) => {
    const ms = date.getTime() - now.getTime()
    const sec = Math.round(ms / 1000)
    const absSec = Math.abs(sec)
    const sign = sec < 0 ? -1 : 1

    if (absSec < 60) return rtf.format(sign * Math.round(sec), "second")
    const min = Math.round(sec / 60)
    if (Math.abs(min) < 60) return rtf.format(min, "minute")
    const hr = Math.round(sec / 3600)
    if (Math.abs(hr) < 24) return rtf.format(hr, "hour")
    const day = Math.round(sec / 86400)
    if (Math.abs(day) < 7) return rtf.format(day, "day")
    const week = Math.round(day / 7)
    if (Math.abs(week) < 5) return rtf.format(week, "week")
    const month = Math.round(day / 30)
    if (Math.abs(month) < 12) return rtf.format(month, "month")
    return rtf.format(Math.round(day / 365), "year")
  },
}
