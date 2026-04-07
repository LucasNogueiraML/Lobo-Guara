export type Habito = {
  id: string
  title: string
  streak: number
  ultimo_concluido: string | null
  historico?: string[]
  user_id?: string
}

function parseISODate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return new Date(year, month - 1, day)
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getTodayISO(): string {
  return toISODate(new Date())
}

export function normalizarHistorico(historico?: string[] | null): string[] {
  if (!Array.isArray(historico)) return []

  const set = new Set<string>()
  historico.forEach((date) => {
    if (typeof date !== "string") return
    const parsed = parseISODate(date)
    if (!parsed) return
    set.add(toISODate(parsed))
  })

  return Array.from(set).sort()
}

export function inferirHistorico(habito: Habito): string[] {
  const fromPayload = normalizarHistorico(habito.historico)
  if (fromPayload.length > 0) return fromPayload

  if (!habito.ultimo_concluido) return []

  const parsedLast = parseISODate(habito.ultimo_concluido)
  if (!parsedLast) return []

  const inferred: string[] = [toISODate(parsedLast)]
  const totalDays = Math.max(habito.streak, 1)

  for (let dayOffset = 1; dayOffset < totalDays; dayOffset += 1) {
    const date = new Date(parsedLast)
    date.setDate(parsedLast.getDate() - dayOffset)
    inferred.push(toISODate(date))
  }

  return normalizarHistorico(inferred)
}

export function isConcluidoHoje(habito: Habito): boolean {
  const historico = inferirHistorico(habito)
  const hoje = getTodayISO()

  if (historico.includes(hoje)) return true
  if (!habito.ultimo_concluido) return false

  return habito.ultimo_concluido === hoje
}

export function calcularStreakDoHistorico(historico: string[]): number {
  const historySet = new Set(normalizarHistorico(historico))
  let streak = 0
  const date = new Date()

  while (historySet.has(toISODate(date))) {
    streak += 1
    date.setDate(date.getDate() - 1)
  }

  return streak
}

export function obterUltimoConcluido(historico: string[]): string | null {
  const sorted = normalizarHistorico(historico)
  if (sorted.length === 0) return null
  return sorted[sorted.length - 1]
}

export function calcularStreak(habito: Habito, concluindoHoje: boolean): number {
  if (!concluindoHoje) return 0

  const historico = inferirHistorico(habito)
  const updated = normalizarHistorico([...historico, getTodayISO()])

  return calcularStreakDoHistorico(updated)
}
