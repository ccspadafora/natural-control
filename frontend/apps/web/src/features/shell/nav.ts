/** Navegación por rol — espejo del NAV del prototipo (líneas 1333–1338). */

export type NavItem = {
  id: string
  label: string
  icon: string
  path: string
  /** Contador rojo (discrepancias GPS pendientes). */
  countKey?: "geo"
  /** Flag de producto (`user.features.<key>`). */
  feature?: "pipeline" | "whatsapp" | "automation" | "erp" | "ai_reports"
}

const BACKLOG_NAV: NavItem[] = [
  { id: "embudo", label: "Embudo", icon: "funnel", path: "/consola/embudo", feature: "pipeline" },
  { id: "mensajes", label: "Mensajes", icon: "message", path: "/consola/mensajes", feature: "whatsapp" },
  { id: "automatizaciones", label: "Automatizaciones", icon: "settings", path: "/consola/automatizaciones", feature: "automation" },
]

export type RoleCode = "RTC" | "LIDER_ZONA" | "GERENCIA" | "ADMIN" | "ADMIN_PRODUCTO"

const RTC: NavItem[] = [
  { id: "inicio", label: "Mis números", icon: "home", path: "/portal" },
  { id: "agenda", label: "Agenda", icon: "calendar", path: "/portal/agenda" },
  { id: "clientes", label: "Cartera", icon: "users", path: "/portal/clientes" },
  { id: "forecast", label: "Mi forecast", icon: "funnel", path: "/portal/forecast" },
  { id: "programacion", label: "Programación semanal", icon: "clock", path: "/portal/programacion" },
  { id: "micarta", label: "Mi carta y liga", icon: "target", path: "/portal/micarta" },
]

const LIDER: NavItem[] = [
  { id: "inicio", label: "Inicio", icon: "home", path: "/consola" },
  { id: "visitas", label: "Visitas en vivo", icon: "pin", path: "/consola/visitas" },
  { id: "geo", label: "Geolocalización", icon: "crosshair", path: "/consola/geo", countKey: "geo" },
  { id: "tableros", label: "Tableros", icon: "dashboard", path: "/consola/tableros" },
  { id: "programacion", label: "Programación y asignación", icon: "calendar", path: "/consola/programacion" },
  { id: "liga", label: "Liga", icon: "target", path: "/consola/liga" },
  { id: "clientes", label: "Clientes", icon: "users", path: "/consola/clientes" },
  ...BACKLOG_NAV,
]

const GERENCIA: NavItem[] = [
  { id: "inicio", label: "Inicio", icon: "home", path: "/consola" },
  { id: "visitas", label: "Visitas en vivo", icon: "pin", path: "/consola/visitas" },
  { id: "tableros", label: "Tableros", icon: "dashboard", path: "/consola/tableros" },
  { id: "forecast", label: "Forecast", icon: "funnel", path: "/consola/forecast" },
  { id: "mapa", label: "Mapa de zonas", icon: "map", path: "/consola/mapa" },
  { id: "liga", label: "Liga", icon: "target", path: "/consola/liga" },
  { id: "programacion", label: "Programación y asignación", icon: "calendar", path: "/consola/programacion" },
  { id: "clientes", label: "Clientes", icon: "users", path: "/consola/clientes" },
  ...BACKLOG_NAV,
]

const ADMIN_BACKLOG: NavItem[] = [
  { id: "erp", label: "Conciliación ERP", icon: "refresh", path: "/consola/erp", feature: "erp" },
  { id: "informes", label: "Informes IA", icon: "dashboard", path: "/consola/informes", feature: "ai_reports" },
  { id: "auditoria", label: "Bitácora", icon: "clock", path: "/consola/auditoria" },
  { id: "capacitacion", label: "Capacitación", icon: "target", path: "/consola/capacitacion" },
]

const ADMIN: NavItem[] = [
  { id: "salud", label: "Salud del sistema", icon: "activity", path: "/consola/salud" },
  { id: "usuarios", label: "Usuarios", icon: "users", path: "/consola/usuarios" },
  { id: "zonas", label: "Zonas y carteras", icon: "map", path: "/consola/zonas" },
  { id: "productos", label: "Catálogo", icon: "box", path: "/consola/productos" },
  { id: "precios", label: "Precios", icon: "tag", path: "/consola/precios" },
  { id: "parametros", label: "Parámetros", icon: "settings", path: "/consola/parametros" },
  ...ADMIN_BACKLOG,
  ...BACKLOG_NAV,
]

export function navFor(role: string): NavItem[] {
  switch (role) {
    case "RTC":
      return RTC
    case "LIDER_ZONA":
      return LIDER
    case "GERENCIA":
      return GERENCIA
    case "ADMIN":
    case "ADMIN_PRODUCTO":
      return ADMIN
    default:
      return LIDER
  }
}

export function homeFor(role: string): string {
  if (role === "RTC") return "/portal"
  if (role === "ADMIN" || role === "ADMIN_PRODUCTO") return "/consola/salud"
  return "/consola"
}
