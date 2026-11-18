export type LeagueForm = "up" | "flat" | "down"

export type LeaguePlayerApi = {
  id: string
  slug: string
  name: string
  initials: string
  email: string
  zone_code: string
  zone_name: string
  gen: number | null
  attributes_scores: number[] | null
  sales: number
  budget: number
  visits: number
  visits_target: number
  verif: number | null
  nuevos: number | null
  pot: number | null
  conc: number | null
  cob: number | null
  eff: number | null
  stale: number | null
  form: LeagueForm
  form_word: string
  chg: number
  erp: string
  tier_name: string
  tier_border: string
  tier_bg: string
  d1_pct: number | null
  d2_pct: number | null
  rank_national: number | null
  rank_zone: number | null
  expected: number
  falta: number
  pos?: number | null
}

export type LeagueBoard = {
  period_start: string
  day: number
  days_in_month: number
  zones: { id: string; name: string }[]
  results: LeaguePlayerApi[]
  badges: { code: string; title: string; name: string; user_id: string | null; reason: string }[]
  bottom_third: { user_id: string; name: string; attr: string; value: number; action: string }[]
  ideal_pitch: {
    k: string
    n: string
    user_id: string
    name: string
    value: number
    gen: number | null
    zone: string
    tier_border: string
    tier_bg: string
  }[]
  attr_labels: { k: string; n: string }[]
}

export type ScorecardDetail = {
  period_start: string
  player: LeaguePlayerApi
  zone_avg: number[]
  neighborhood: { pos: number | null; user_id: string; name: string; gen: number | null; is_me: boolean }[]
  zone_rank: number | null
  zone_size: number
  attr_labels: { k: string; n: string }[]
}
