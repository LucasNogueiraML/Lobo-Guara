"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { calcularPrevisao } from "@/app/api/lib/calculo"
import TransactionCard from "@/components/TransactionCard"
import TransactionModal from "@/components/TransactionModal"
import { usePrivacyMode } from "@/lib/privacyMode"
import { FilterType, Transaction, formatBRL } from "@/types/finance"
import styles from "./FinancePage.module.css"

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "receitas", label: "Receitas" },
  { key: "despesas", label: "Despesas" },
]

function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function parseMonthKey(monthKey: string): Date | null {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)

  if (month < 1 || month > 12) return null
  return new Date(year, month - 1, 1)
}

function formatMonthKeyLabel(monthKey: string): string {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return monthKey

  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(parsed)
}

function extractMonthKey(dateValue?: string): string | null {
  if (!dateValue) return null
  const isoDateMatch = dateValue.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoDateMatch) return dateValue.slice(0, 7)

  const isoMonthMatch = dateValue.match(/^\d{4}-\d{2}$/)
  if (isoMonthMatch) return dateValue

  return null
}

export default function FinancePage() {
  const now = new Date()
  const currentMonthKey = monthKeyFromDate(now)

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

  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>("todas")
  const [syncStatus, setSyncStatus] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)

  const monthPickerRef = useRef<HTMLDivElement | null>(null)
  const privacyEnabled = usePrivacyMode()
  const previsao = useMemo(() => calcularPrevisao(transactions), [transactions])

  useEffect(() => {
    const local = (() => {
      try {
        const raw = localStorage.getItem("transactions")
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? (parsed as Transaction[]) : []
      } catch {
        return [] as Transaction[]
      }
    })()

    fetch("/api/financeiro")
      .then((res) => res.json())
      .then((data) => {
        const remote = Array.isArray(data) ? (data as Transaction[]) : []
        const remoteIds = new Set(remote.map((transaction) => transaction.id))
        const onlyLocal = local.filter((transaction) => !remoteIds.has(transaction.id))
        const merged = [...remote, ...onlyLocal]
        setTransactions(merged)
        localStorage.setItem("transactions", JSON.stringify(merged))
      })
      .catch(() => {
        setTransactions(local)
      })
  }, [])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!monthPickerRef.current) return
      if (monthPickerRef.current.contains(event.target as Node)) return
      setMonthMenuOpen(false)
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    set.add(currentMonthKey)

    transactions.forEach((transaction) => {
      const monthKey = extractMonthKey(transaction.date)
      if (monthKey) set.add(monthKey)
    })

    return Array.from(set).sort((left, right) => right.localeCompare(left)).slice(0, 24)
  }, [transactions, currentMonthKey])

  const activeMonth = availableMonths.includes(selectedMonth) ? selectedMonth : currentMonthKey

  const monthTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const monthKey = extractMonthKey(transaction.date)
        return monthKey === activeMonth
      }),
    [transactions, activeMonth],
  )

  const totals = useMemo(() => {
    const totalReceitas = monthTransactions
      .filter((transaction) => transaction.type === "receita")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

    const totalDespesas = monthTransactions
      .filter((transaction) => transaction.type === "despesa")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

    return {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      receitasCount: monthTransactions.filter((transaction) => transaction.type === "receita").length,
      despesasCount: monthTransactions.filter((transaction) => transaction.type === "despesa").length,
    }
  }, [monthTransactions])

  const forecastMonth = useMemo(
    () => previsao.find((item) => item.mesAno === activeMonth),
    [previsao, activeMonth],
  )

  const filtered = monthTransactions.filter((transaction) => {
    if (filter === "receitas") return transaction.type === "receita"
    if (filter === "despesas") return transaction.type === "despesa"
    return true
  })

  function formatMoney(value: number): string {
    return privacyEnabled ? "****" : formatBRL(Number(value))
  }

  async function handleAdd(transaction: Transaction): Promise<boolean> {
    const optimistic = [transaction, ...transactions]
    setTransactions(optimistic)
    localStorage.setItem("transactions", JSON.stringify(optimistic))

    try {
      const response = await fetch("/api/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
      })

      if (!response.ok) {
        setSyncStatus("Transacao salva localmente, mas nao sincronizou com o banco.")
        return true
      }

      setSyncStatus("Transacao salva e sincronizada.")
      return true
    } catch {
      setSyncStatus("Sem conexao com o banco. Transacao mantida localmente.")
      return true
    }
  }

  async function handleDelete(id: string) {
    await fetch("/api/financeiro", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })

    setTransactions((prev) => {
      const updated = prev.filter((transaction) => transaction.id !== id)
      localStorage.setItem("transactions", JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.monthPickerWrap} ref={monthPickerRef}>
            <h1 className={styles.pageTitle}>Financeiro</h1>
            <button
              type="button"
              className={styles.monthPickerButton}
              onClick={() => setMonthMenuOpen((current) => !current)}
            >
              {formatMonthKeyLabel(activeMonth)}
              <span className={styles.monthPickerCaret}>▾</span>
            </button>

            {monthMenuOpen && (
              <div className={styles.monthPickerMenu}>
                {availableMonths.map((monthKey) => (
                  <button
                    key={monthKey}
                    type="button"
                    className={`${styles.monthOption} ${monthKey === activeMonth ? styles.monthOptionActive : ""}`}
                    onClick={() => {
                      setSelectedMonth(monthKey)
                      setMonthMenuOpen(false)
                    }}
                  >
                    {formatMonthKeyLabel(monthKey)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
            <span className={styles.addIcon}>+</span>
            Nova transacao
          </button>
        </header>

        {syncStatus && (
          <p
            style={{
              margin: "4px 0 12px 0",
              fontSize: 12,
              color: syncStatus.includes("sincronizada") ? "#86efac" : "#fca5a5",
            }}
          >
            {syncStatus}
          </p>
        )}

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Saldo do mes</p>
            <p className={`${styles.summaryValue} ${totals.saldo >= 0 ? styles.summaryPositive : styles.summaryNegative}`}>
              {formatMoney(Math.abs(totals.saldo))}
            </p>
            <p className={styles.summaryHint}>{totals.saldo >= 0 ? "Mes no positivo" : "Mes no negativo"}</p>
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total receitas</p>
            <p className={`${styles.summaryValue} ${styles.summaryPositive}`}>{formatMoney(totals.totalReceitas)}</p>
            <p className={styles.summaryHint}>{totals.receitasCount} entradas no mes</p>
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total despesas</p>
            <p className={`${styles.summaryValue} ${styles.summaryNegative}`}>{formatMoney(totals.totalDespesas)}</p>
            <p className={styles.summaryHint}>{totals.despesasCount} saidas no mes</p>
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Gastos previstos</p>
            <p className={`${styles.summaryValue} ${styles.summaryNegative}`}>
              {formatMoney(Number(forecastMonth?.despesasPrevistas ?? 0))}
            </p>
            <p className={styles.summaryHint}>
              {forecastMonth?.transacoes.filter((transaction) => transaction.type === "despesa").length ?? 0} saidas previstas
            </p>
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Receitas previstas</p>
            <p className={`${styles.summaryValue} ${styles.summaryPositive}`}>
              {formatMoney(Number(forecastMonth?.receitasPrevistas ?? 0))}
            </p>
            <p className={styles.summaryHint}>
              {forecastMonth?.transacoes.filter((transaction) => transaction.type === "receita").length ?? 0} entradas previstas
            </p>
          </div>
        </div>

        <div className={styles.filters}>
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.filterBtn} ${filter === key ? styles.filterActive : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.transactionList}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize: 40 }}>$</span>
              <p>Sem transacoes para {formatMonthKeyLabel(activeMonth)}.</p>
            </div>
          ) : (
            filtered.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} onDelete={handleDelete} />
            ))
          )}
        </div>
      </main>

      {modalOpen && <TransactionModal onClose={() => setModalOpen(false)} onAdd={handleAdd} />}
    </div>
  )
}
