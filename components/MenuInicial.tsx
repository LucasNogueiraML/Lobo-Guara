"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import styles from "./MenuInicial.module.css"
import { calcularPorCategoria, calcularPrevisao, calcularResumoGeral, calcularResumoTarefas } from "@/app/api/lib/calculo"
import { Transaction, formatBRL } from "@/types/finance"
import { Task } from "@/types/task"

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"]

type CashflowPoint = {
  mes: string
  receitas: number
  despesas: number
  saldo: number
}

type ForecastPoint = {
  mes: string
  receitas: number
  despesas: number
  saldo: number
}

type CategoryPoint = {
  categoria: string
  total: number
}

type PriorityPoint = {
  prioridade: string
  pendentes: number
  concluidas: number
}

type WeekLoadPoint = {
  dia: string
  pendentes: number
}

type PiePoint = {
  name: string
  value: number
  color: string
  displayValue?: number
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDate(value?: string): Date | null {
  if (!value) return null

  const normalized = value.trim()
  if (!normalized) return null

  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDate) {
    const year = Number.parseInt(isoDate[1], 10)
    const month = Number.parseInt(isoDate[2], 10)
    const day = Number.parseInt(isoDate[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day)
    }
  }

  const slashDate = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slashDate) {
    const day = Number.parseInt(slashDate[1], 10)
    const month = Number.parseInt(slashDate[2], 10)
    const currentYear = new Date().getFullYear()
    const rawYear = slashDate[3] ? Number.parseInt(slashDate[3], 10) : currentYear
    const fullYear = rawYear < 100 ? 2000 + rawYear : rawYear

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(fullYear, month - 1, day)
    }
  }

  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  return null
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function shortMonthYear(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`
}

function formatCount(value: number): string {
  return `${value} tarefa${value === 1 ? "" : "s"}`
}

function formatSignedCurrency(value: number): string {
  const prefix = value >= 0 ? "+" : "-"
  return `${prefix}${formatBRL(Math.abs(value))}`
}

export default function MenuInicial() {
  const router = useRouter()
  const { data: session } = useSession()

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === "undefined") return []

    try {
      const local = window.localStorage.getItem("tasks")
      const parsed = local ? JSON.parse(local) : []
      return Array.isArray(parsed) ? (parsed as Task[]) : []
    } catch {
      return []
    }
  })

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === "undefined") return []

    try {
      const local = window.localStorage.getItem("transactions")
      const parsed = local ? JSON.parse(local) : []
      return Array.isArray(parsed) ? (parsed as Transaction[]) : []
    } catch {
      return []
    }
  })

  const [chartsReady, setChartsReady] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    fetch("/api/tasks")
      .then((response) => response.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setTasks(list)
        localStorage.setItem("tasks", JSON.stringify(list))
      })
      .catch(() => {})

    fetch("/api/financeiro")
      .then((response) => response.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setTransactions(list)
        localStorage.setItem("transactions", JSON.stringify(list))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true)
      setChartsReady(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const resumoTarefas = useMemo(() => calcularResumoTarefas(tasks), [tasks])
  const resumoFinanceiro = useMemo(() => calcularResumoGeral(transactions), [transactions])
  const previsao = useMemo(() => calcularPrevisao(transactions), [transactions])
  const categorias = useMemo(() => calcularPorCategoria(transactions), [transactions])

  const nome = session?.user?.name?.split(" ")[0] ?? "voce"

  const saudacao = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }, [])

  const analytics = useMemo(() => {
    const now = new Date()
    const today = toDayStart(now)
    const next7Days = new Date(today)
    next7Days.setDate(today.getDate() + 7)

    let overdueTasks = 0
    let upcomingTasks = 0
    let noDeadlineTasks = 0
    let pendingToday = 0

    const priorityAccumulator: Record<Task["priority"], PriorityPoint> = {
      alta: { prioridade: "Alta", pendentes: 0, concluidas: 0 },
      media: { prioridade: "Media", pendentes: 0, concluidas: 0 },
      baixa: { prioridade: "Baixa", pendentes: 0, concluidas: 0 },
    }

    const weekLoadMap = new Map<string, WeekLoadPoint>()
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(today)
      date.setDate(today.getDate() + index)
      const key = date.toISOString().slice(0, 10)
      weekLoadMap.set(key, { dia: WEEKDAY_LABELS[date.getDay()], pendentes: 0 })
    }

    tasks.forEach((task) => {
      const bucket = priorityAccumulator[task.priority] ?? priorityAccumulator.media
      if (task.completed) bucket.concluidas += 1
      else bucket.pendentes += 1

      const dueDate = parseDate(task.data)
      if (!dueDate) {
        if (!task.completed) noDeadlineTasks += 1
        return
      }

      const dueDay = toDayStart(dueDate)
      if (!task.completed && dueDay < today) overdueTasks += 1
      if (!task.completed && dueDay >= today && dueDay <= next7Days) upcomingTasks += 1
      if (!task.completed && dueDay.getTime() === today.getTime()) pendingToday += 1

      const weekKey = dueDay.toISOString().slice(0, 10)
      if (!task.completed && weekLoadMap.has(weekKey)) {
        const current = weekLoadMap.get(weekKey)
        if (current) {
          current.pendentes += 1
          weekLoadMap.set(weekKey, current)
        }
      }
    })

    const lastSixMonthsDates = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return date
    })

    const cashflowMap = new Map<string, CashflowPoint>()
    lastSixMonthsDates.forEach((date) => {
      cashflowMap.set(monthKey(date), {
        mes: shortMonthYear(date),
        receitas: 0,
        despesas: 0,
        saldo: 0,
      })
    })

    transactions.forEach((transaction) => {
      const date = parseDate(transaction.date)
      if (!date) return

      const key = monthKey(date)
      const bucket = cashflowMap.get(key)
      if (!bucket) return

      if (transaction.type === "receita") {
        bucket.receitas += Number(transaction.amount)
      } else {
        bucket.despesas += Number(transaction.amount)
      }
      bucket.saldo = bucket.receitas - bucket.despesas
      cashflowMap.set(key, bucket)
    })

    const cashflowSeries = Array.from(cashflowMap.values())
    const currentCashflow = cashflowSeries[cashflowSeries.length - 1]
    const previousCashflow = cashflowSeries[cashflowSeries.length - 2]
    const saldoDelta = (currentCashflow?.saldo ?? 0) - (previousCashflow?.saldo ?? 0)

    const savingsRate =
      resumoFinanceiro.totalReceitas > 0
        ? (resumoFinanceiro.saldoAtual / resumoFinanceiro.totalReceitas) * 100
        : 0

    const expensePressure =
      resumoFinanceiro.totalReceitas > 0
        ? (resumoFinanceiro.totalDespesas / resumoFinanceiro.totalReceitas) * 100
        : 0

    const forecastData: ForecastPoint[] = previsao.slice(0, 3).map((month) => ({
      mes: `${MONTH_LABELS[month.mes - 1]}/${String(month.ano).slice(-2)}`,
      receitas: Number(month.receitasPrevistas),
      despesas: Number(month.despesasPrevistas),
      saldo: Number(month.saldoPrevisto),
    }))

    const expenseCategories: CategoryPoint[] = categorias
      .filter((category) => category.type === "despesa")
      .slice(0, 5)
      .map((category) => ({
        categoria: category.category,
        total: Number(category.total),
      }))

    const priorityData: PriorityPoint[] = [
      priorityAccumulator.alta,
      priorityAccumulator.media,
      priorityAccumulator.baixa,
    ]

    const weekLoadData = Array.from(weekLoadMap.values())

    const completionRate = resumoTarefas.total
      ? Math.round((resumoTarefas.concluidas / resumoTarefas.total) * 100)
      : 0

    const pieData: PiePoint[] =
      resumoTarefas.total === 0
        ? [{ name: "Sem tarefas", value: 1, color: "rgba(148, 163, 184, 0.65)", displayValue: 0 }]
        : [
            { name: "Concluidas", value: resumoTarefas.concluidas, color: "#22c55e" },
            {
              name: "Pendentes",
              value: Math.max(resumoTarefas.total - resumoTarefas.concluidas, 0),
              color: "#ef4444",
            },
          ]

    const insight =
      overdueTasks > 0
        ? `Existem ${overdueTasks} tarefas atrasadas. Priorize a fila de alta para reduzir risco operacional.`
        : resumoFinanceiro.saldoAtual < 0
          ? "O caixa atual esta negativo. Revise despesas recorrentes e negocie custos fixos." 
          : expensePressure > 75
            ? "A pressao de despesas esta alta. Procure reduzir gastos variaveis nas proximas semanas."
            : "Indicadores estao estaveis. Bom momento para executar tarefas estrategicas e manter o ritmo."

    const headerMessage =
      pendingToday > 0
        ? `${formatCount(pendingToday)} vencem hoje.`
        : "Sem vencimentos criticos hoje."

    return {
      overdueTasks,
      upcomingTasks,
      noDeadlineTasks,
      pendingToday,
      completionRate,
      savingsRate,
      expensePressure,
      saldoDelta,
      cashflowSeries,
      forecastData,
      expenseCategories,
      priorityData,
      weekLoadData,
      pieData,
      insight,
      headerMessage,
    }
  }, [tasks, transactions, resumoFinanceiro, resumoTarefas, previsao, categorias])

  if (!mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.main} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <header className={styles.topBar}>
          <div>
            <h1 className={styles.title}>{saudacao}, {nome}</h1>
            <p className={styles.subtitle}>{analytics.headerMessage}</p>
          </div>
        </header>

        <main className={styles.dashboard}>
          <section
            className={`${styles.card} ${styles.cardA} ${styles.clickableCard}`}
            onClick={() => router.push("/financeiro")}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Finance Ops</h3>
                <p className={styles.cardHint}>Receita, despesa e saldo dos ultimos 6 meses</p>
              </div>
              <span className={styles.kpiMain}>{formatSignedCurrency(resumoFinanceiro.saldoAtual)}</span>
            </div>

            <div className={styles.kpiGrid}>
              <div className={styles.kpiItem}>
                <p className={styles.kpiLabel}>Taxa poupanca</p>
                <p className={`${styles.kpiValue} ${analytics.savingsRate >= 0 ? styles.positive : styles.negative}`}>
                  {analytics.savingsRate.toFixed(1)}%
                </p>
              </div>
              <div className={styles.kpiItem}>
                <p className={styles.kpiLabel}>Pressao despesa</p>
                <p className={`${styles.kpiValue} ${analytics.expensePressure <= 70 ? styles.positive : styles.negative}`}>
                  {analytics.expensePressure.toFixed(1)}%
                </p>
              </div>
              <div className={styles.kpiItem}>
                <p className={styles.kpiLabel}>Delta mensal</p>
                <p className={`${styles.kpiValue} ${analytics.saldoDelta >= 0 ? styles.positive : styles.negative}`}>
                  {formatSignedCurrency(analytics.saldoDelta)}
                </p>
              </div>
            </div>

            <div className={styles.chartLarge}>
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.cashflowSeries} margin={{ top: 8, right: 10, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(value) => formatBRL(Number(value)).replace("R$", "")}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17, 24, 39, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                        color: "#f8fafc",
                      }}
                      formatter={(value, name) => {
                        const numericValue = typeof value === "number" ? value : Number(value) || 0
                        return [formatBRL(numericValue), String(name)]
                      }}
                    />
                    <Bar name="Receitas" dataKey="receitas" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    <Bar name="Despesas" dataKey="despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Line
                      name="Saldo"
                      type="monotone"
                      dataKey="saldo"
                      stroke="#7dd3fc"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#7dd3fc", strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.chartPlaceholder}>Carregando grafico...</div>
              )}
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.cardB} ${styles.clickableCard}`}
            onClick={() => router.push("/tarefas")}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Execucao diaria</h3>
                <p className={styles.cardHint}>Fila de tarefas operacionais</p>
              </div>
            </div>

            <p className={styles.kpiMain}>{analytics.pendingToday}</p>
            <p className={styles.kpiSub}>pendentes para hoje</p>

            <div className={styles.progressMeta}>
              <span>Taxa de conclusao</span>
              <span>{analytics.completionRate}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${analytics.completionRate}%` }} />
            </div>

            <div className={styles.badgeRow}>
              <span className={styles.badge}>Semana: {resumoTarefas.semana}</span>
              <span className={styles.badge}>Sem prazo: {resumoTarefas.indeterminado}</span>
            </div>
          </section>

          <section className={`${styles.card} ${styles.cardC}`}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Risco de prazo</h3>
                <p className={styles.cardHint}>Indicadores de SLA pessoal</p>
              </div>
            </div>

            <div className={styles.riskList}>
              <div className={styles.riskItem}>
                <span className={styles.riskLabel}>Atrasadas</span>
                <span className={`${styles.riskValue} ${analytics.overdueTasks > 0 ? styles.riskDanger : styles.riskSafe}`}>
                  {analytics.overdueTasks}
                </span>
              </div>
              <div className={styles.riskItem}>
                <span className={styles.riskLabel}>Vencem em 7 dias</span>
                <span className={`${styles.riskValue} ${analytics.upcomingTasks > 0 ? styles.riskWarn : styles.riskSafe}`}>
                  {analytics.upcomingTasks}
                </span>
              </div>
              <div className={styles.riskItem}>
                <span className={styles.riskLabel}>Sem prazo definido</span>
                <span className={`${styles.riskValue} ${analytics.noDeadlineTasks > 0 ? styles.riskWarn : styles.riskSafe}`}>
                  {analytics.noDeadlineTasks}
                </span>
              </div>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.cardD} ${styles.clickableCard}`}
            onClick={() => router.push("/simulacao")}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Previsao 90 dias</h3>
                <p className={styles.cardHint}>Saldo projetado por mes</p>
              </div>
            </div>

            <div className={styles.chartMedium}>
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.forecastData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(value) => formatBRL(Number(value)).replace("R$", "")}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17, 24, 39, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                        color: "#f8fafc",
                      }}
                      formatter={(value) => {
                        const numericValue = typeof value === "number" ? value : Number(value) || 0
                        return [formatBRL(numericValue), "Saldo"]
                      }}
                    />
                    <Bar dataKey="saldo" radius={[8, 8, 0, 0]}>
                      {analytics.forecastData.map((point, index) => (
                        <Cell key={`${point.mes}-${index}`} fill={point.saldo >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.chartPlaceholder}>Carregando grafico...</div>
              )}
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.cardE} ${styles.clickableCard}`}
            onClick={() => router.push("/financeiro")}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Top despesas</h3>
                <p className={styles.cardHint}>Categorias com maior impacto</p>
              </div>
            </div>

            <div className={styles.chartMedium}>
              {chartsReady ? (
                analytics.expenseCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.expenseCategories} layout="vertical" margin={{ top: 8, right: 4, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="categoria"
                        width={82}
                        tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                        tickFormatter={(value: string) => (value.length > 11 ? `${value.slice(0, 11)}...` : value)}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(17, 24, 39, 0.95)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "10px",
                          color: "#f8fafc",
                        }}
                        formatter={(value) => {
                          const numericValue = typeof value === "number" ? value : Number(value) || 0
                          return [formatBRL(numericValue), "Despesa"]
                        }}
                      />
                      <Bar dataKey="total" fill="#f97316" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.chartPlaceholder}>Sem despesas para analisar.</div>
                )
              ) : (
                <div className={styles.chartPlaceholder}>Carregando grafico...</div>
              )}
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.cardF} ${styles.clickableCard}`}
            onClick={() => router.push("/tarefas")}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Backlog prioridade</h3>
                <p className={styles.cardHint}>Pendentes vs concluidas</p>
              </div>
            </div>

            <div className={styles.chartSmall}>
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.priorityData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="prioridade" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17, 24, 39, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                        color: "#f8fafc",
                      }}
                      formatter={(value, name) => {
                        const numericValue = typeof value === "number" ? value : Number(value) || 0
                        return [formatCount(numericValue), String(name)]
                      }}
                    />
                    <Bar dataKey="concluidas" name="Concluidas" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.chartPlaceholder}>Carregando grafico...</div>
              )}
            </div>
          </section>

          <section className={`${styles.card} ${styles.cardG}`}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Insight automatico</h3>
                <p className={styles.cardHint}>Leitura sintetica da operacao</p>
              </div>
            </div>

            <p className={styles.insightText}>{analytics.insight}</p>
            <p className={styles.insightFoot}>Atualizado em tempo real com base em tarefas e financeiro.</p>
          </section>

          <section
            className={`${styles.card} ${styles.cardH} ${styles.clickableCard}`}
            onClick={() => router.push("/tarefas")}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Mix tarefas</h3>
                <p className={styles.cardHint}>Concluidas vs pendentes</p>
              </div>
            </div>

            <div className={styles.pieLayout}>
              <div className={styles.pieWrap}>
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={62}
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {analytics.pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.chartPlaceholder}>...</div>
                )}

                <div className={styles.pieCenter}>
                  <strong>{resumoTarefas.total}</strong>
                  <span>total</span>
                </div>
              </div>

              <div className={styles.legendList}>
                {analytics.pieData.map((item) => (
                  <div key={item.name} className={styles.legendItem}>
                    <div className={styles.legendText}>
                      <span className={styles.legendDot} style={{ background: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className={styles.legendValue}>{item.displayValue ?? item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.cardI} ${styles.clickableCard}`}
            onClick={() => router.push("/tarefas")}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Carga proximos 7 dias</h3>
                <p className={styles.cardHint}>Distribuicao de vencimentos pendentes</p>
              </div>
            </div>

            <div className={styles.chartMedium}>
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.weekLoadData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17, 24, 39, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                        color: "#f8fafc",
                      }}
                      formatter={(value) => {
                        const numericValue = typeof value === "number" ? value : Number(value) || 0
                        return [formatCount(numericValue), "Pendentes"]
                      }}
                    />
                    <Bar dataKey="pendentes" fill="#60a5fa" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.chartPlaceholder}>Carregando grafico...</div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
