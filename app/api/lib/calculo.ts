import { Transaction } from "@/types/finance"
import { Task } from "@/types/task"

// â”€â”€â”€ UtilitÃ¡rios de data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function mesDeDate(date: string): number {
  return parseInt(date.split("-")[1], 10)
}

export function anoDeDate(date: string): number {
  return parseInt(date.split("-")[0], 10)
}

export function chaveMesAno(date: string): string {
  return date.slice(0, 7)
}

export function hoje(): string {
  return new Date().toISOString().split("T")[0]
}

function formatarDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`
}

function normalizarDate(dateValue?: string | null): string | null {
  if (!dateValue) return null

  const normalized = dateValue.trim()
  if (!normalized) return null

  const isoDateMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (isoDateMatch) return isoDateMatch[1]

  const isoDateTimeMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (isoDateTimeMatch) return isoDateTimeMatch[1]

  const slashDateMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slashDateMatch) {
    const day = Number.parseInt(slashDateMatch[1], 10)
    const month = Number.parseInt(slashDateMatch[2], 10)
    const currentYear = new Date().getFullYear()
    const rawYear = slashDateMatch[3] ? Number.parseInt(slashDateMatch[3], 10) : currentYear
    const fullYear = rawYear < 100 ? 2000 + rawYear : rawYear

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return formatarDateKey(parsed)
}

// â”€â”€â”€ 1. Totais por mÃªs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ResumoMes = {
  mesAno: string
  mes: number
  ano: number
  receitas: number
  despesas: number
  saldo: number
}

export function calcularPorMes(transactions: Transaction[]): ResumoMes[] {
  const mapa: Record<string, ResumoMes> = {}
  const hojeStr = hoje()

  for (const t of transactions) {
    const dateKey = normalizarDate(t.date)
    if (!dateKey || dateKey > hojeStr) continue

    const chave = chaveMesAno(dateKey)
    if (!mapa[chave]) {
      mapa[chave] = {
        mesAno: chave,
        mes: mesDeDate(dateKey),
        ano: anoDeDate(dateKey),
        receitas: 0,
        despesas: 0,
        saldo: 0,
      }
    }

    if (t.type === "receita") mapa[chave].receitas += Number(t.amount)
    else                      mapa[chave].despesas += Number(t.amount)

    mapa[chave].saldo = mapa[chave].receitas - mapa[chave].despesas
  }

  return Object.values(mapa).sort((a, b) => a.mesAno.localeCompare(b.mesAno))
}

// â”€â”€â”€ 2. Totais por categoria â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ResumoCategoria = {
  category: string
  type: "receita" | "despesa"
  total: number
  quantidade: number
}

export function calcularPorCategoria(transactions: Transaction[]): ResumoCategoria[] {
  const mapa: Record<string, ResumoCategoria> = {}
  const hojeStr = hoje()

  for (const t of transactions) {
    const dateKey = normalizarDate(t.date)
    if (!dateKey || dateKey > hojeStr) continue

    const chave = `${t.category}__${t.type}`
    if (!mapa[chave]) {
      mapa[chave] = { category: t.category, type: t.type, total: 0, quantidade: 0 }
    }
    mapa[chave].total      += Number(t.amount)
    mapa[chave].quantidade += 1
  }

  return Object.values(mapa).sort((a, b) => b.total - a.total)
}

// â”€â”€â”€ 3. ExpansÃ£o de recorrÃªncia â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function expandirRecorrencia(t: Transaction, ate: string): Transaction[] {
  const baseDateKey = normalizarDate(t.date)
  if (!t.recorrencia || !baseDateKey) return []

  const resultado: Transaction[] = []
  const dataBase = new Date(`${baseDateKey}T00:00:00`)
  const dataFim  = new Date(ate)
  const hojeStr  = hoje()

  const avancar = (d: Date): Date => {
    const nova = new Date(d)
    const rec  = t.recorrencia!

    if (rec === "D") {
      nova.setDate(nova.getDate() + 1)
    } else if (rec.startsWith("S")) {
      const diaSemana = parseInt(rec[1], 10)
      nova.setDate(nova.getDate() + 1)
      while (nova.getDay() !== diaSemana) nova.setDate(nova.getDate() + 1)
    } else if (rec.startsWith("M")) {
      const diaOriginal = dataBase.getDate()
      nova.setDate(1)
      nova.setMonth(nova.getMonth() + 1)
      const ultimoDia = new Date(nova.getFullYear(), nova.getMonth() + 1, 0).getDate()
      nova.setDate(Math.min(diaOriginal, ultimoDia))
    } else if (rec.startsWith("A")) {
      const intervalo = parseInt(rec.slice(1), 10)
      nova.setDate(nova.getDate() + intervalo)
    }

    return nova
  }

  let atual = avancar(dataBase)

  while (atual <= dataFim) {
    const dateStr = atual.toISOString().split("T")[0]
    if (dateStr > hojeStr) {
      resultado.push({
        ...t,
        id: `${t.id}_rec_${dateStr}`,
        date: dateStr,
        amount: Number(t.amount),
        data: atual.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      })
    }
    atual = avancar(atual)
  }

  return resultado
}

// â”€â”€â”€ 4. PrevisÃ£o dos prÃ³ximos 3 meses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PrevisaoMes = {
  mesAno: string
  mes: number
  ano: number
  receitasPrevistas: number
  despesasPrevistas: number
  saldoPrevisto: number
  transacoes: Transaction[]
}

export function calcularPrevisao(transactions: Transaction[], meses = 3): PrevisaoMes[] {
  const hojeDate = new Date()
  const hojeStr  = hoje()

  const limite = new Date(hojeDate)
  limite.setMonth(limite.getMonth() + meses)
  const limiteStr = limite.toISOString().split("T")[0]

  const futuras: Transaction[] = []

  for (const t of transactions) {
    const dateKey = normalizarDate(t.date)
    if (!dateKey || dateKey <= hojeStr || t.recorrencia) continue
    futuras.push({ ...t, date: dateKey })
  }

  const recorrentes = transactions
    .filter((t) => t.recorrencia)
    .flatMap((t) => expandirRecorrencia(t, limiteStr))

  const todas = [...futuras, ...recorrentes].filter((t) => {
    const dateKey = normalizarDate(t.date)
    return Boolean(dateKey && dateKey <= limiteStr)
  })

  const mapa: Record<string, PrevisaoMes> = {}

  for (const t of todas) {
    const dateKey = normalizarDate(t.date)
    if (!dateKey) continue

    const chave = chaveMesAno(dateKey)
    if (!mapa[chave]) {
      mapa[chave] = {
        mesAno: chave,
        mes: mesDeDate(dateKey),
        ano: anoDeDate(dateKey),
        receitasPrevistas: 0,
        despesasPrevistas: 0,
        saldoPrevisto: 0,
        transacoes: [],
      }
    }

    if (t.type === "receita") mapa[chave].receitasPrevistas += Number(t.amount)
    else                      mapa[chave].despesasPrevistas += Number(t.amount)

    mapa[chave].saldoPrevisto =
      mapa[chave].receitasPrevistas - mapa[chave].despesasPrevistas

    mapa[chave].transacoes.push({ ...t, date: dateKey })
  }

  for (let i = 1; i <= meses; i++) {
    const d = new Date(hojeDate)
    d.setMonth(d.getMonth() + i)
    const chave = d.toISOString().slice(0, 7)
    if (!mapa[chave]) {
      mapa[chave] = {
        mesAno: chave,
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
        receitasPrevistas: 0,
        despesasPrevistas: 0,
        saldoPrevisto: 0,
        transacoes: [],
      }
    }
  }

  return Object.values(mapa).sort((a, b) => a.mesAno.localeCompare(b.mesAno))
}

// â”€â”€â”€ 5. Resumo geral (para o Dashboard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ResumoGeral = {
  saldoAtual: number
  totalReceitas: number
  totalDespesas: number
  saldoPrevisto3Meses: number
  maiorDespesaCategoria: string
  maiorReceitaCategoria: string
}

export function calcularResumoGeral(transactions: Transaction[]): ResumoGeral {
  const hojeStr = hoje()

  const passadas = transactions.filter((t) => {
    const dateKey = normalizarDate(t.date)
    return Boolean(dateKey && dateKey <= hojeStr)
  })

  const totalReceitas = passadas
    .filter((t) => t.type === "receita")
    .reduce((s, t) => s + Number(t.amount), 0)

  const totalDespesas = passadas
    .filter((t) => t.type === "despesa")
    .reduce((s, t) => s + Number(t.amount), 0)

  const previsao = calcularPrevisao(transactions)
  const saldoPrevisto3Meses = previsao.reduce(
    (s, m) => s + Number(m.saldoPrevisto), 0
  )

  const categorias = calcularPorCategoria(transactions)
  const maiorDespesa = categorias.find((c) => c.type === "despesa")
  const maiorReceita = categorias.find((c) => c.type === "receita")

  return {
    saldoAtual: totalReceitas - totalDespesas,
    totalReceitas,
    totalDespesas,
    saldoPrevisto3Meses,
    maiorDespesaCategoria: maiorDespesa?.category ?? "â€”",
    maiorReceitaCategoria: maiorReceita?.category ?? "â€”",
  }
}
export function calcularResumoTarefas(tasks: Task[]) {
  const hojeStr = new Date().toISOString().split("T")[0]

  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const amanhaStr = amanha.toISOString().split("T")[0]

  const inicioSemana = new Date()
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay())
  const fimSemana = new Date(inicioSemana)
  fimSemana.setDate(fimSemana.getDate() + 6)
  const fimSemanaStr = fimSemana.toISOString().split("T")[0]
  const inicioSemanaStr = inicioSemana.toISOString().split("T")[0]

  return {
    hoje:          tasks.filter(t => t.data === hojeStr && !t.completed).length,
    amanha:        tasks.filter(t => t.data === amanhaStr && !t.completed).length,
    semana:        tasks.filter(t => t.data && t.data >= inicioSemanaStr && t.data <= fimSemanaStr && !t.completed).length,
    indeterminado: tasks.filter(t => !t.data || t.data === "indeterminado").length,
    concluidas:    tasks.filter(t => t.completed).length,
    total:         tasks.length,
  }
}
