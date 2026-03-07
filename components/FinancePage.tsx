"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./FinancePage.module.css"
import TransactionCard from "@/./components/TransactionCard"
import TransactionModal from "@/./components/TransactionModal"
import { Transaction, FilterType, formatBRL } from "@/./types/finance"

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "1", title: "Salário",          amount: 5000, type: "receita", category: "Salário",      date: "01/03" },
  { id: "2", title: "Aluguel",          amount: 1500, type: "despesa", category: "Moradia",      date: "05/03" },
  { id: "3", title: "Supermercado",     amount: 320,  type: "despesa", category: "Alimentação",  date: "06/03" },
  { id: "4", title: "Freelance React",  amount: 800,  type: "receita", category: "Freelance",    date: "03/03" },
  { id: "5", title: "Uber",             amount: 45,   type: "despesa", category: "Transporte",   date: "06/03" },
]

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: "todas",    label: "Todas"    },
  { key: "receitas", label: "Receitas" },
  { key: "despesas", label: "Despesas" },
]

export default function FinancePage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS)
  const [modalOpen, setModalOpen]       = useState(false)
  const [filter, setFilter]             = useState<FilterType>("todas")

  const totalReceitas = transactions.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0)
  const totalDespesas = transactions.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0)
  const saldo         = totalReceitas - totalDespesas

  const filtered = transactions.filter((t) => {
    if (filter === "receitas") return t.type === "receita"
    if (filter === "despesas") return t.type === "despesa"
    return true
  })

  function handleAdd(t: Transaction) {
    setTransactions((prev) => [t, ...prev])
  }

  function handleDelete(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className={styles.page}>

      {/* Backgrounds */}
      <div className={styles.bg} />
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      {/* Main */}
      <main className={styles.main}>

        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Financeiro</h1>
            <p className={styles.pageSubtitle}>Março 2025</p>
          </div>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
            <span className={styles.addIcon}>+</span>
            Nova transação
          </button>
        </header>

        {/* Cards de resumo */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Saldo atual</p>
            <p className={`${styles.summaryValue} ${saldo >= 0 ? styles.summaryPositive : styles.summaryNegative}`}>
              {formatBRL(saldo)}
            </p>
            <p className={styles.summaryHint}>{saldo >= 0 ? "Você está no positivo 🎉" : "Atenção aos gastos ⚠️"}</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total receitas</p>
            <p className={`${styles.summaryValue} ${styles.summaryPositive}`}>{formatBRL(totalReceitas)}</p>
            <p className={styles.summaryHint}>{transactions.filter((t) => t.type === "receita").length} entradas</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total despesas</p>
            <p className={`${styles.summaryValue} ${styles.summaryNegative}`}>{formatBRL(totalDespesas)}</p>
            <p className={styles.summaryHint}>{transactions.filter((t) => t.type === "despesa").length} saídas</p>
          </div>
        </div>

        {/* Filtros */}
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

        {/* Lista */}
        <div className={styles.transactionList}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize: 40 }}>💸</span>
              <p>Nenhuma transação aqui!</p>
            </div>
          ) : (
            filtered.map((t) => (
              <TransactionCard key={t.id} transaction={t} onDelete={handleDelete} />
            ))
          )}
        </div>

      </main>

      {/* Modal */}
      {modalOpen && (
        <TransactionModal onClose={() => setModalOpen(false)} onAdd={handleAdd} />
      )}

    </div>
  )
}
