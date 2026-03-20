"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import styles from "./FinancePage.module.css"
import TransactionCard from "@/./components/TransactionCard"
import TransactionModal from "@/./components/TransactionModal"
import { Transaction, FilterType, formatBRL } from "@/./types/finance"
import { calcularPorMes, calcularPorCategoria, calcularPrevisao } from "@/app/api/lib/calculo"

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: "todas",    label: "Todas"    },
  { key: "receitas", label: "Receitas" },
  { key: "despesas", label: "Despesas" },
]

export default function FinancePage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [modalOpen, setModalOpen]       = useState(false)
  const [filter, setFilter]             = useState<FilterType>("todas")

  const porMes       = calcularPorMes(transactions)
  const porCategoria = calcularPorCategoria(transactions)
  const previsao     = calcularPrevisao(transactions)
  const mesAtual = new Date().toISOString().slice(0, 7)
  const mes = previsao.find((m) => m.mesAno === mesAtual)

  useEffect(() => {
    const local = localStorage.getItem("transactions")
    if (local) setTransactions(JSON.parse(local))

    fetch("/api/financeiro")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setTransactions(list)
        localStorage.setItem("transactions", JSON.stringify(list))
      })
      .catch(() => console.log("Usando dados locais"))
  }, [])

  const totalReceitas = transactions
  .filter((t) => t.type === "receita")
  .reduce((s, t) => s + Number(t.amount), 0)

const totalDespesas = transactions
  .filter((t) => t.type === "despesa")
  .reduce((s, t) => s + Number(t.amount), 0)

  //const gastosPrevistos = transactions = transactions.filter
  const saldo = totalReceitas - totalDespesas

  const filtered = transactions.filter((t) => {
    if (filter === "receitas") return t.type === "receita"
    if (filter === "despesas") return t.type === "despesa"
    return true
  })

  async function handleAdd(t: Transaction) {
    await fetch("/api/financeiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    })
    const updated = [t, ...transactions]
    setTransactions(updated)
    localStorage.setItem("transactions", JSON.stringify(updated))
  }

  async function handleDelete(id: string) {
    await fetch("/api/financeiro", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className={styles.page}>

      {/* Backgrounds */}
      <div className={styles.bg} />


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
              {formatBRL(Math.abs(Number(saldo)))}
            </p>
            <p className={styles.summaryHint}>{saldo >= 0 ? "Você está no positivo 🎉" : "Atenção aos gastos ⚠️"}</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total receitas</p>
            <p className={`${styles.summaryValue} ${styles.summaryPositive}`}>{formatBRL(Number(totalReceitas))}</p>
            <p className={styles.summaryHint}>{transactions.filter((t) => t.type === "receita").length} entradas</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total despesas</p>
            <p className={`${styles.summaryValue} ${styles.summaryNegative}`}>{formatBRL(Number(totalDespesas)  )}</p>
            <p className={styles.summaryHint}>{transactions.filter((t) => t.type === "despesa").length} saídas</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Gastos Previstos neste mês</p>
            <p className={`${styles.summaryValue} ${styles.summaryNegative}`}>{formatBRL(Number(mes?.despesasPrevistas ?? 0))}</p>
            <p className={styles.summaryHint}>{mes?.transacoes.filter(t => t.type === "despesa").length ?? 0} saídas previstas</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Receitas Previstas neste mês</p>
            <p className={`${styles.summaryValue} ${styles.summaryPositive}`}>{formatBRL(Number(mes?.receitasPrevistas ?? 0))}</p>
            <p className={styles.summaryHint}>{mes?.transacoes.filter(t => t.type === "receita").length ?? 0} entradas previstas</p>
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
