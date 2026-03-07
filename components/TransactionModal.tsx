"use client"

import { useState } from "react"
import styles from "./FinancePage.module.css"
import {
  Transaction, TransactionType,
  CATEGORIES_RECEITA, CATEGORIES_DESPESA,
  TYPE_CONFIG,
} from "@/./types/finance"
import { v4 as uuidv4 } from "uuid"

type Props = {
  onClose: () => void
  onAdd: (t: Transaction) => void
}

export default function TransactionModal({ onClose, onAdd }: Props) {
  const [title, setTitle]       = useState("")
  const [amount, setAmount]     = useState("")
  const [type, setType]         = useState<TransactionType>("despesa")
  const [category, setCategory] = useState(CATEGORIES_DESPESA[0])
  const [errors, setErrors]     = useState<Record<string, string>>({})

  const categories = type === "receita" ? CATEGORIES_RECEITA : CATEGORIES_DESPESA

  function handleTypeChange(t: TransactionType) {
    setType(t)
    setCategory(t === "receita" ? CATEGORIES_RECEITA[0] : CATEGORIES_DESPESA[0])
  }

  function handleSubmit() {
    const newErrors: Record<string, string> = {}
    if (!title.trim())         newErrors.title  = "Dê um nome para a transação"
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
                               newErrors.amount = "Informe um valor válido"
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    const newTransaction: Transaction = {
      id: uuidv4(),
      title,
      amount: Number(amount),
      type,
      category,
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    }

    onAdd(newTransaction)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nova transação</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tipo */}
        <div className={styles.field}>
          <label className={styles.label}>Tipo</label>
          <div className={styles.typePillGroup}>
            {(["receita", "despesa"] as TransactionType[]).map((t) => {
              const cfg = TYPE_CONFIG[t]
              return (
                <button
                  key={t}
                  className={styles.typePill}
                  style={type === t ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color } : {}}
                  onClick={() => handleTypeChange(t)}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Título */}
        <div className={styles.field}>
          <label className={styles.label}>Descrição <span style={{ color: "#f87171" }}>*</span></label>
          <input
            autoFocus
            className={`${styles.input} ${errors.title ? styles.inputError : ""}`}
            placeholder="Ex: Aluguel, Salário, Mercado..."
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })) }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          {errors.title && <span className={styles.errorMsg}>{errors.title}</span>}
        </div>

        {/* Valor + Categoria */}
        <div className={styles.fieldRow}>
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label}>Valor (R$) <span style={{ color: "#f87171" }}>*</span></label>
            <input
              className={`${styles.input} ${errors.amount ? styles.inputError : ""}`}
              placeholder="0,00"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: "" })) }}
            />
            {errors.amount && <span className={styles.errorMsg}>{errors.amount}</span>}
          </div>

          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label}>Categoria</label>
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Ações */}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.submitBtn} onClick={handleSubmit}>Adicionar</button>
        </div>

      </div>
    </div>
  )
}
