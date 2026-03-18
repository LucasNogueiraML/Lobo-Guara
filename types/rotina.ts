export type Habito = {
  id: string
  title: string
  streak: number
  ultimo_concluido: string | null // data ISO ex: "2026-03-17"
  user_id?: string
}

export function isConcluidoHoje(habito: Habito): boolean {
  if (!habito.ultimo_concluido) return false
  const hoje = new Date().toISOString().split("T")[0]
  return habito.ultimo_concluido === hoje
}

export function calcularStreak(habito: Habito, concluindoHoje: boolean): number {
  if (!concluindoHoje) return 0

  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  const ontemISO = ontem.toISOString().split("T")[0]

  // Se já concluiu ontem, mantém streak + 1, senão começa do 1
  if (habito.ultimo_concluido === ontemISO || habito.ultimo_concluido === hoje.toISOString().split("T")[0]) {
    return habito.streak + (habito.ultimo_concluido === ontemISO ? 1 : 0)
  }
  return 1
}