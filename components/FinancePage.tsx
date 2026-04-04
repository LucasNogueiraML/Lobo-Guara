"use client"

import { useEffect, useMemo, useState } from "react"
import styles from "./FinancePage.module.css"
import TransactionCard from "@/./components/TransactionCard"
import TransactionModal from "@/./components/TransactionModal"
import { Transaction, FilterType, formatBRL } from "@/./types/finance"
import { calcularPrevisao, calcularResumoGeral } from "@/app/api/lib/calculo"

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "receitas", label: "Receitas" },
  { key: "despesas", label: "Despesas" },
]

export default function FinancePage() {
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

  const resumoFinanceiro = useMemo(() => calcularResumoGeral(transactions), [transactions])
  const previsao = useMemo(() => calcularPrevisao(transactions), [transactions])

  const mesAtual = new Date().toISOString().slice(0, 7)
  const mes = previsao.find((m) => m.mesAno === mesAtual)
  const hojeStr = new Date().toISOString().split("T")[0]

  const transacoesPassadas = useMemo(
    () => transactions.filter((transaction) => transaction.date && transaction.date <= hojeStr),
    [transactions, hojeStr]
  )

  useEffect(() => {
    fetch("/api/financeiro")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setTransactions(list)
        localStorage.setItem("transactions", JSON.stringify(list))
      })
      .catch(() => console.log("Usando dados locais"))
  }, [])

  const totalReceitas = resumoFinanceiro.totalReceitas
  const totalDespesas = resumoFinanceiro.totalDespesas
  const saldo = resumoFinanceiro.saldoAtual

  const filtered = transactions.filter((transaction) => {
    if (filter === "receitas") return transaction.type === "receita"
    if (filter === "despesas") return transaction.type === "despesa"
    return true
  })

  async function handleAdd(transaction: Transaction) {
    await fetch("/api/financeiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    })

    const updated = [transaction, ...transactions]
    setTransactions(updated)
    localStorage.setItem("transactions", JSON.stringify(updated))
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
          <div>
            <h1 className={styles.pageTitle}>Financeiro</h1>
            <p className={styles.pageSubtitle}>Marco 2025</p>
          </div>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
            <span className={styles.addIcon}>+</span>
            Nova transacao
          </button>
        </header>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Saldo atual</p>
            <p className={`${styles.summaryValue} ${saldo >= 0 ? styles.summaryPositive : styles.summaryNegative}`}>
              {formatBRL(Math.abs(Number(saldo)))}
            </p>
            <p className={styles.summaryHint}>{saldo >= 0 ? "Voce esta no positivo" : "Atencao aos gastos"}</p>
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total receitas</p>
            <p className={`${styles.summaryValue} ${styles.summaryPositive}`}>{formatBRL(Number(totalReceitas))}</p>
            <p className={styles.summaryHint}>
              {transacoesPassadas.filter((transaction) => transaction.type === "receita").length} entradas realizadas
            </p>
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total despesas</p>
            <p className={`${styles.summaryValue} ${styles.summaryNegative}`}>{formatBRL(Number(totalDespesas))}</p>
            <p className={styles.summaryHint}>
              {transacoesPassadas.filter((transaction) => transaction.type === "despesa").length} saidas realizadas
            </p>
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Gastos previstos neste mes</p>
            <p className={`${styles.summaryValue} ${styles.summaryNegative}`}>
              {formatBRL(Number(mes?.despesasPrevistas ?? 0))}
            </p>
            <p className={styles.summaryHint}>
              {mes?.transacoes.filter((transaction) => transaction.type === "despesa").length ?? 0} saidas previstas
            </p>
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Receitas previstas neste mes</p>
            <p className={`${styles.summaryValue} ${styles.summaryPositive}`}>
              {formatBRL(Number(mes?.receitasPrevistas ?? 0))}
            </p>
            <p className={styles.summaryHint}>
              {mes?.transacoes.filter((transaction) => transaction.type === "receita").length ?? 0} entradas previstas
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
              <p>Nenhuma transacao aqui!</p>
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
