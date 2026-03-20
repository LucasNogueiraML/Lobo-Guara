"use client"

import styles from "./FinancePage.module.css"
import { Transaction, TYPE_CONFIG, formatBRL } from "@/./types/finance"

const CATEGORY_ICONS: Record<string, string> = {
  Salário: "💼", Freelance: "💻", Investimentos: "📈", Outros: "📦",
  Moradia: "🏠", Alimentação: "🍔", Transporte: "🚗", Saúde: "❤️",
  Lazer: "🎮", Educação: "📚",
}

type Props = {
  transaction: Transaction
  onDelete: (id: string) => void
}

export default function TransactionCard({ transaction, onDelete }: Props) {
  const cfg = TYPE_CONFIG[transaction.type]
  const icon = CATEGORY_ICONS[transaction.category] ?? "💰"

  return (
    <div className={styles.transactionCard}>
      <div
        className={styles.transactionIcon}
        style={{ background: cfg.bg }}
      >
        {icon}
      </div>

      <div className={styles.transactionContent}>
        <span className={styles.transactionTitle}>{transaction.title}</span>
        <div className={styles.transactionMeta}>
          <span
            className={styles.badge}
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
          >
            {cfg.label}
          </span>
          <span
            className={styles.badge}
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
          >
            {transaction.category}
          </span>
          <span className={styles.transactionDate}>{transaction.date}</span>
        </div>
      </div>

      <div className={styles.transactionRight}>
        <span
          className={`${styles.transactionAmount} ${
            transaction.type === "receita" ? styles.amountPositive : styles.amountNegative
          }`}
        >
          {cfg.sign} {formatBRL(Number(transaction.amount))}
        </span>
        <button className={styles.deleteBtn} onClick={() => onDelete(transaction.id)}>✕</button>
      </div>
    </div>
  )
}
