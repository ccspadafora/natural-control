import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudOff,
  Crosshair,
  Filter,
  Home,
  LayoutDashboard,
  Map,
  Activity,
  Box,
  MapPin,
  MapPinOff,
  MessageSquare,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Tag,
  Target,
  User,
  Users,
  X,
} from "lucide-react"
import type { SVGProps } from "react"

export const iconNames = [
  "check",
  "x",
  "alert",
  "pin",
  "pinOff",
  "cloudOff",
  "refresh",
  "clock",
  "arrowUp",
  "arrowDown",
  "minus",
  "plus",
  "camera",
  "crosshair",
  "home",
  "users",
  "funnel",
  "message",
  "search",
  "chevronRight",
  "chevronLeft",
  "calendar",
  "map",
  "dashboard",
  "user",
  "target",
  "activity",
  "box",
  "tag",
  "settings",
] as const

export type IconName = (typeof iconNames)[number]

const MAP: Record<IconName, LucideIcon> = {
  check: Check,
  x: X,
  alert: AlertTriangle,
  pin: MapPin,
  pinOff: MapPinOff,
  cloudOff: CloudOff,
  refresh: RefreshCw,
  clock: Clock,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  minus: Minus,
  plus: Plus,
  camera: Camera,
  crosshair: Crosshair,
  home: Home,
  users: Users,
  funnel: Filter,
  message: MessageSquare,
  search: Search,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  calendar: Calendar,
  map: Map,
  dashboard: LayoutDashboard,
  user: User,
  target: Target,
  activity: Activity,
  box: Box,
  tag: Tag,
  settings: Settings,
}

export type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  small?: boolean
}

export function Icon({ name, small, className = "", ...rest }: IconProps) {
  const Cmp = MAP[name] ?? MapPin
  const sizeClass = small ? "nc-icon-sm" : "nc-icon"
  return <Cmp className={[sizeClass, className].filter(Boolean).join(" ")} aria-hidden="true" strokeWidth={2} {...rest} />
}
