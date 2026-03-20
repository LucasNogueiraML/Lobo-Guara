import { Transaction } from "@/types/finance"
import { Task } from "@/types/task"

// ─── Utilitários de data ───────────────────────────────

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

// ─── 1. Totais por mês ────────────────────────────────

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
    if (!t.date || t.date > hojeStr) continue

    const chave = chaveMesAno(t.date)
    if (!mapa[chave]) {
      mapa[chave] = { mesAno: chave, mes: mesDeDate(t.date), ano: anoDeDate(t.date), receitas: 0, despesas: 0, saldo: 0 }
    }

    if (t.type === "receita") mapa[chave].receitas += Number(t.amount)
    else                      mapa[chave].despesas += Number(t.amount)

    mapa[chave].saldo = mapa[chave].receitas - mapa[chave].despesas
  }

  return Object.values(mapa).sort((a, b) => a.mesAno.localeCompare(b.mesAno))
}

// ─── 2. Totais por categoria ──────────────────────────

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
    if (!t.date || t.date > hojeStr) continue

    const chave = `${t.category}__${t.type}`
    if (!mapa[chave]) {
      mapa[chave] = { category: t.category, type: t.type, total: 0, quantidade: 0 }
    }
    mapa[chave].total      += Number(t.amount)
    mapa[chave].quantidade += 1
  }

  return Object.values(mapa).sort((a, b) => b.total - a.total)
}

// ─── 3. Expansão de recorrência ───────────────────────

function expandirRecorrencia(t: Transaction, ate: string): Transaction[] {
  if (!t.recorrencia || !t.date) return []

  const resultado: Transaction[] = []
  const dataBase = new Date(t.date)
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

// ─── 4. Previsão dos próximos 3 meses ────────────────

export type PrevisaoMes = {
  mesAno: string
  mes: number
  ano: number
  receitasPrevistas: number
  despesasPrevistas: number
  saldoPrevisto: number
  transacoes: Transaction[]
}

export function calcularPrevisao(transactions: Transaction[]): PrevisaoMes[] {
  const hojeDate = new Date()
  const hojeStr  = hoje()

  const limite = new Date(hojeDate)
  limite.setMonth(limite.getMonth() + 3)
  const limiteStr = limite.toISOString().split("T")[0]

  const futuras = transactions.filter(
    (t) => t.date && t.date > hojeStr && !t.recorrencia
  )

  const recorrentes = transactions
    .filter((t) => t.recorrencia)
    .flatMap((t) => expandirRecorrencia(t, limiteStr))

  const todas = [...futuras, ...recorrentes].filter(
    (t) => t.date && t.date <= limiteStr
  )

  const mapa: Record<string, PrevisaoMes> = {}

  for (const t of todas) {
    const chave = chaveMesAno(t.date!)
    if (!mapa[chave]) {
      mapa[chave] = {
        mesAno: chave,
        mes: mesDeDate(t.date!),
        ano: anoDeDate(t.date!),
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

    mapa[chave].transacoes.push(t)
  }

  for (let i = 1; i <= 3; i++) {
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

// ─── 5. Resumo geral (para o Dashboard) ──────────────

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

  const passadas = transactions.filter((t) => t.date && t.date <= hojeStr)

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
    maiorDespesaCategoria: maiorDespesa?.category ?? "—",
    maiorReceitaCategoria: maiorReceita?.category ?? "—",
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