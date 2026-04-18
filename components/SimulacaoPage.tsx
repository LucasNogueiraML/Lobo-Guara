"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import styles from "./SimulacaoPage.module.css"
import { usePrivacyMode } from "@/lib/privacyMode"
import {
  CATEGORIES_DESPESA,
  CATEGORIES_RECEITA,
  Transaction,
  TransactionType,
  formatBRL,
} from "@/types/finance"
import { calcularPrevisao, calcularResumoGeral } from "@/app/api/lib/calculo"

type SimulacaoItem = {
  id: string
  title: string
  type: TransactionType
  category: string
  amount: number
  startMonth: string
  durationMonths: number
}

type InvestConfig = {
  capitalInicial: number
  aporteMensal: number
  jurosMensal: number
}

type ForecastPoint = {
  mesAno: string
  label: string
  receitasBase: number
  despesasBase: number
  saldoBase: number
  receitasSim: number
  despesasSim: number
  saldoSim: number
  saldoBaseAcumulado: number
  saldoSimAcumulado: number
  impacto: number
  juros: number
  patrimonio: number
}

const SIM_ITEMS_STORAGE_KEY = "simulacao-items-v1"
const SIM_INVEST_STORAGE_KEY = "simulacao-invest-v1"

function monthFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function parseMonthKey(month: string): Date | null {
  const parsed = month.match(/^(\d{4})-(\d{2})$/)
  if (!parsed) return null

  const year = Number.parseInt(parsed[1], 10)
  const monthNumber = Number.parseInt(parsed[2], 10)
  if (monthNumber < 1 || monthNumber > 12) return null

  return new Date(year, monthNumber - 1, 1)
}

function monthDiff(startMonth: string, targetMonth: string): number | null {
  const start = parseMonthKey(startMonth)
  const target = parseMonthKey(targetMonth)
  if (!start || !target) return null

  return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth())
}

function formatSignedCurrency(value: number): string {
  const prefix = value >= 0 ? "+" : "-"
  return `${prefix}${formatBRL(Math.abs(value))}`
}

function toMonthLabel(mesAno: string): string {
  const parsed = parseMonthKey(mesAno)
  if (!parsed) return mesAno

  const month = parsed
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase()

  return `${month}/${String(parsed.getFullYear()).slice(-2)}`
}

function parseLocalTransactions(): Transaction[] {
  if (typeof window === "undefined") return []

  try {
    const local = window.localStorage.getItem("transactions")
    const parsed = local ? JSON.parse(local) : []
    return Array.isArray(parsed) ? (parsed as Transaction[]) : []
  } catch {
    return []
  }
}

export default function SimulacaoPage() {
  const privacyEnabled = usePrivacyMode()
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return parseLocalTransactions()
  })

  const [simulationItems, setSimulationItems] = useState<SimulacaoItem[]>(() => {
    if (typeof window === "undefined") return []

    try {
      const local = window.localStorage.getItem(SIM_ITEMS_STORAGE_KEY)
      const parsed = local ? JSON.parse(local) : []
      return Array.isArray(parsed) ? (parsed as SimulacaoItem[]) : []
    } catch {
      return []
    }
  })

  const [investConfig, setInvestConfig] = useState<InvestConfig>(() => {
    if (typeof window === "undefined") {
      return { capitalInicial: 0, aporteMensal: 0, jurosMensal: 0.9 }
    }

    try {
      const local = window.localStorage.getItem(SIM_INVEST_STORAGE_KEY)
      if (!local) return { capitalInicial: 0, aporteMensal: 0, jurosMensal: 0.9 }

      const parsed = JSON.parse(local)
      return {
        capitalInicial: Number(parsed?.capitalInicial ?? 0),
        aporteMensal: Number(parsed?.aporteMensal ?? 0),
        jurosMensal: Number(parsed?.jurosMensal ?? 0.9),
      }
    } catch {
      return { capitalInicial: 0, aporteMensal: 0, jurosMensal: 0.9 }
    }
  })

  const [chartsReady, setChartsReady] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [title, setTitle] = useState("")
  const [type, setType] = useState<TransactionType>("despesa")
  const [category, setCategory] = useState(CATEGORIES_DESPESA[0])
  const [amount, setAmount] = useState("")
  const [startMonth, setStartMonth] = useState(() => monthFromDate(new Date()))
  const [durationMonths, setDurationMonths] = useState("12")

  function formatCurrencyForUI(value: number): string {
    return privacyEnabled ? "****" : formatBRL(value)
  }

  function formatSignedForUI(value: number): string {
    if (privacyEnabled) return value >= 0 ? "+ ****" : "- ****"
    return formatSignedCurrency(value)
  }

  useEffect(() => {
    const localTransactions = parseLocalTransactions()

    fetch("/api/financeiro")
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao buscar financeiro")
        return response.json()
      })
      .then((data) => {
        const remote = Array.isArray(data) ? (data as Transaction[]) : []
        const remoteIds = new Set(remote.map((transaction) => transaction.id))
        const onlyLocal = localTransactions.filter((transaction) => !remoteIds.has(transaction.id))
        const merged = [...remote, ...onlyLocal]

        setTransactions(merged)
        localStorage.setItem("transactions", JSON.stringify(merged))
      })
      .catch(() => {
        setTransactions(localTransactions)
        localStorage.setItem("transactions", JSON.stringify(localTransactions))
      })
  }, [])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true)
      setChartsReady(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(SIM_ITEMS_STORAGE_KEY, JSON.stringify(simulationItems))
  }, [simulationItems, mounted])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(SIM_INVEST_STORAGE_KEY, JSON.stringify(investConfig))
  }, [investConfig, mounted])

  const baseline = useMemo(() => {
    const rawForecast = calcularPrevisao(transactions, 12)
    const rawMap = new Map(rawForecast.map((month) => [month.mesAno, month]))

    const start = new Date()
    start.setDate(1)

    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1)
      const mesAno = monthFromDate(date)
      const existing = rawMap.get(mesAno)

      return {
        mesAno,
        mes: date.getMonth() + 1,
        ano: date.getFullYear(),
        receitasPrevistas: Number(existing?.receitasPrevistas ?? 0),
        despesasPrevistas: Number(existing?.despesasPrevistas ?? 0),
        saldoPrevisto: Number(existing?.saldoPrevisto ?? 0),
        transacoes: existing?.transacoes ?? [],
      }
    })
  }, [transactions])

  const resumoFinanceiro = useMemo(() => calcularResumoGeral(transactions), [transactions])

  const simulationData = useMemo<ForecastPoint[]>(() => {
    const patrimonioInicial = Math.max(0, Number(investConfig.capitalInicial) || 0)
    const aporteMensal = Math.max(0, Number(investConfig.aporteMensal) || 0)
    const jurosRate = Math.max(0, Number(investConfig.jurosMensal) || 0) / 100
    const saldoInicial = Number(resumoFinanceiro.saldoAtual) || 0

    const series = baseline.reduce(
      (acc, month) => {
        const extraReceitas = simulationItems.reduce((sum, item) => {
          if (item.type !== "receita") return sum
          const diff = monthDiff(item.startMonth, month.mesAno)
          if (diff === null || diff < 0 || diff >= item.durationMonths) return sum
          return sum + Number(item.amount)
        }, 0)

        const extraDespesas = simulationItems.reduce((sum, item) => {
          if (item.type !== "despesa") return sum
          const diff = monthDiff(item.startMonth, month.mesAno)
          if (diff === null || diff < 0 || diff >= item.durationMonths) return sum
          return sum + Number(item.amount)
        }, 0)

        const capitalComAporte = acc.capital + aporteMensal
        const juros = capitalComAporte * jurosRate
        const patrimonio = capitalComAporte + juros

        const receitasBase = Number(month.receitasPrevistas)
        const despesasBase = Number(month.despesasPrevistas)
        const receitasSim = receitasBase + extraReceitas + juros
        const despesasSim = despesasBase + extraDespesas
        const saldoBase = receitasBase - despesasBase
        const saldoSim = receitasSim - despesasSim
        const saldoBaseAcumulado = acc.saldoBaseAcumulado + saldoBase
        const saldoSimAcumulado = acc.saldoSimAcumulado + saldoSim

        const point: ForecastPoint = {
          mesAno: month.mesAno,
          label: toMonthLabel(month.mesAno),
          receitasBase,
          despesasBase,
          saldoBase,
          receitasSim,
          despesasSim,
          saldoSim,
          saldoBaseAcumulado,
          saldoSimAcumulado,
          impacto: saldoSim - saldoBase,
          juros,
          patrimonio,
        }

        return {
          capital: patrimonio,
          saldoBaseAcumulado,
          saldoSimAcumulado,
          points: [...acc.points, point],
        }
      },
      {
        capital: patrimonioInicial,
        saldoBaseAcumulado: saldoInicial,
        saldoSimAcumulado: saldoInicial,
        points: [] as ForecastPoint[],
      }
    )

    return series.points
  }, [baseline, simulationItems, investConfig, resumoFinanceiro.saldoAtual])

  const summary = useMemo(() => {
    const saldoInicial = Number(resumoFinanceiro.saldoAtual) || 0
    const totalGanhosAntes = simulationData.reduce((sum, item) => sum + item.receitasBase, 0)
    const totalGanhosDepois = simulationData.reduce((sum, item) => sum + item.receitasSim, 0)
    const totalGastosAntes = simulationData.reduce((sum, item) => sum + item.despesasBase, 0)
    const totalGastosDepois = simulationData.reduce((sum, item) => sum + item.despesasSim, 0)
    const saldoAntes = saldoInicial + simulationData.reduce((sum, item) => sum + item.saldoBase, 0)
    const saldoDepois = saldoInicial + simulationData.reduce((sum, item) => sum + item.saldoSim, 0)
    const jurosTotal = simulationData.reduce((sum, item) => sum + item.juros, 0)
    const patrimonioFinal = simulationData[simulationData.length - 1]?.patrimonio ?? investConfig.capitalInicial

    return {
      totalGanhosAntes,
      totalGanhosDepois,
      totalGastosAntes,
      totalGastosDepois,
      saldoAntes,
      saldoDepois,
      jurosTotal,
      patrimonioFinal,
      impactoTotal: saldoDepois - saldoAntes,
    }
  }, [simulationData, investConfig.capitalInicial, resumoFinanceiro.saldoAtual])

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType)
    setCategory(nextType === "receita" ? CATEGORIES_RECEITA[0] : CATEGORIES_DESPESA[0])
  }

  function handleAddSimulation() {
    const numericAmount = Number(amount)
    const numericDuration = Number(durationMonths)

    if (!title.trim()) return
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return
    if (!startMonth) return
    if (!Number.isFinite(numericDuration) || numericDuration < 1 || numericDuration > 24) return

    const newItem: SimulacaoItem = {
      id: `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: title.trim(),
      type,
      category,
      amount: numericAmount,
      startMonth,
      durationMonths: Math.round(numericDuration),
    }

    setSimulationItems((prev) => [newItem, ...prev])
    setTitle("")
    setAmount("")
    setDurationMonths("12")
  }

  function handleDeleteSimulation(id: string) {
    setSimulationItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (!mounted) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Simulacao e previsao</h1>
            <p className={styles.pageSubtitle}>Cenario de 12 meses sem afetar o financeiro real</p>
          </div>
        </header>

        <section className={styles.heroPanel}>
          <div className={styles.heroHeader}>
            <div>
              <h3 className={styles.heroTitle}>Projecao de saldo (12 meses)</h3>
              <p className={styles.heroHint}>Saldo acumulado base vs simulado com overlay transparente</p>
            </div>
            <span className={`${styles.impactBadge} ${summary.impactoTotal >= 0 ? styles.impactPositive : styles.impactNegative}`}>
              Impacto total: {formatSignedForUI(summary.impactoTotal)}
            </span>
          </div>

          <div className={styles.heroChart}>
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simulationData} margin={{ top: 8, right: 12, left: -6, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.09)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.68)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(value) =>
                      privacyEnabled ? "****" : formatBRL(Number(value)).replace("R$", "")
                    }
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
                      if (name === "Impacto") return [formatSignedForUI(numericValue), "Impacto"]
                      if (name === "Juros") return [formatCurrencyForUI(numericValue), "Juros"]
                      return [formatCurrencyForUI(numericValue), String(name)]
                    }}
                  />
                  <Bar
                    name="Saldo mensal (base)"
                    dataKey="saldoBase"
                    fill="rgba(148, 163, 184, 0.25)"
                    radius={[7, 7, 0, 0]}
                  />
                  <Area
                    type="monotone"
                    dataKey="saldoSimAcumulado"
                    name="Saldo acumulado (sim)"
                    fill="rgba(34, 211, 238, 0.16)"
                    stroke="transparent"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    name="Saldo acumulado (base)"
                    dataKey="saldoBaseAcumulado"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#94a3b8", strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    name="Saldo acumulado (sim)"
                    dataKey="saldoSimAcumulado"
                    stroke="rgba(34, 211, 238, 0.9)"
                    strokeWidth={2.4}
                    strokeDasharray="6 4"
                    dot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }}
                    activeDot={{ r: 4.2 }}
                  />
                  <Line
                    type="monotone"
                    name="Juros"
                    dataKey="juros"
                    stroke="rgba(250, 204, 21, 0.85)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.chartPlaceholder}>Carregando grafico...</div>
            )}
          </div>
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Gastos (antes/depois)</p>
            <p className={styles.summaryValue}>{formatCurrencyForUI(summary.totalGastosAntes)}</p>
            <p className={styles.summaryCompare}>Depois: {formatCurrencyForUI(summary.totalGastosDepois)}</p>
          </article>

          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Ganhos (antes/depois)</p>
            <p className={styles.summaryValue}>{formatCurrencyForUI(summary.totalGanhosAntes)}</p>
            <p className={styles.summaryCompare}>Depois: {formatCurrencyForUI(summary.totalGanhosDepois)}</p>
          </article>

          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Saldo (antes/depois)</p>
            <p className={`${styles.summaryValue} ${summary.saldoAntes >= 0 ? styles.positive : styles.negative}`}>
              {formatCurrencyForUI(summary.saldoAntes)}
            </p>
            <p className={`${styles.summaryCompare} ${summary.saldoDepois >= 0 ? styles.positive : styles.negative}`}>
              Depois: {formatCurrencyForUI(summary.saldoDepois)}
            </p>
          </article>

          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Investimentos (juros compostos)</p>
            <p className={styles.summaryValue}>{formatCurrencyForUI(summary.patrimonioFinal)}</p>
            <p className={styles.summaryCompare}>Juros acumulados: {formatCurrencyForUI(summary.jurosTotal)}</p>
          </article>
        </section>

        <section className={styles.bottomGrid}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>Adicionar simulacao</h3>
            <p className={styles.panelHint}>Nao altera o financeiro real. Afeta apenas este cenario.</p>

            <div className={styles.field}>
              <label className={styles.label}>Descricao</label>
              <input
                className={styles.input}
                value={title}
                placeholder="Ex: Novo aluguel, renda extra, curso..."
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tipo</label>
              <div className={styles.pillGroup}>
                <button
                  className={`${styles.pill} ${type === "despesa" ? styles.pillActiveDanger : ""}`}
                  onClick={() => handleTypeChange("despesa")}
                >
                  Despesa
                </button>
                <button
                  className={`${styles.pill} ${type === "receita" ? styles.pillActivePositive : ""}`}
                  onClick={() => handleTypeChange("receita")}
                >
                  Receita
                </button>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Valor mensal (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.input}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Categoria</label>
                <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value)}>
                  {(type === "receita" ? CATEGORIES_RECEITA : CATEGORIES_DESPESA).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Inicio</label>
                <input
                  type="month"
                  className={styles.input}
                  value={startMonth}
                  onChange={(event) => setStartMonth(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Duracao (meses)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  className={styles.input}
                  value={durationMonths}
                  onChange={(event) => setDurationMonths(event.target.value)}
                />
              </div>
            </div>

            <button className={styles.addBtn} onClick={handleAddSimulation}>
              Adicionar ao cenario
            </button>

            <div className={styles.separator} />

            <h4 className={styles.panelSubTitle}>Investimentos</h4>
            <p className={styles.panelHint}>Juros compostos aplicados ao aporte mensal no cenario.</p>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Capital inicial (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.input}
                  value={investConfig.capitalInicial}
                  onChange={(event) =>
                    setInvestConfig((prev) => ({ ...prev, capitalInicial: Number(event.target.value) || 0 }))
                  }
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Aporte mensal (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.input}
                  value={investConfig.aporteMensal}
                  onChange={(event) =>
                    setInvestConfig((prev) => ({ ...prev, aporteMensal: Number(event.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Juros ao mes (%)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                className={styles.input}
                value={investConfig.jurosMensal}
                onChange={(event) =>
                  setInvestConfig((prev) => ({ ...prev, jurosMensal: Number(event.target.value) || 0 }))
                }
              />
            </div>
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>Itens da simulacao</h3>
            <p className={styles.panelHint}>Esses ajustes sao aplicados no grafico de forma transparente.</p>

            <div className={styles.simList}>
              {simulationItems.length === 0 ? (
                <div className={styles.emptyState}>Nenhuma simulacao adicionada.</div>
              ) : (
                simulationItems.map((item) => (
                  <div key={item.id} className={styles.simItem}>
                    <div>
                      <p className={styles.simTitle}>{item.title}</p>
                      <p className={styles.simMeta}>
                        {item.type === "receita" ? "Receita" : "Despesa"} · {item.category} · {item.startMonth} · {item.durationMonths} meses
                      </p>
                    </div>
                    <div className={styles.simRight}>
                      <strong className={item.type === "receita" ? styles.positive : styles.negative}>
                        {formatSignedForUI(item.amount)}
                      </strong>
                      <button className={styles.deleteBtn} onClick={() => handleDeleteSimulation(item.id)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
