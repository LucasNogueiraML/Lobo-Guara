"use client"

import { useState } from "react"
import styles from "./FinancePage.module.css"
import {
  Transaction, TransactionType, TransactionData,
  CATEGORIES_RECEITA, CATEGORIES_DESPESA,
  TYPE_CONFIG, DATA_CONFIG,
} from "@/./types/finance"
import { v4 as uuidv4 } from "uuid"

type Props = {
  onClose: () => void
  onAdd: (t: Transaction) => void
}

type RecorrenciaTipo = "nunca" | "D" | "S" | "M" | "A"

const DIAS_SEMANA = [
  { value: "S0", label: "Dom" },
  { value: "S1", label: "Seg" },
  { value: "S2", label: "Ter" },
  { value: "S3", label: "Qua" },
  { value: "S4", label: "Qui" },
  { value: "S5", label: "Sex" },
  { value: "S6", label: "Sáb" },
]

export default function TransactionModal({ onClose, onAdd }: Props) {
  const [title, setTitle]             = useState("")
  const [amount, setAmount]           = useState("")
  const [type, setType]               = useState<TransactionType>("despesa")
  const [data, setData]               = useState<TransactionData>("Hoje")
  const [customData, setCustomData]   = useState("")
  const [recTipo, setRecTipo]         = useState<RecorrenciaTipo>("nunca")
  const [recDiaSemana, setRecDiaSemana] = useState("S5")
  const [recIntervaloDias, setRecIntervaloDias] = useState("2")
  const [category, setCategory]       = useState(CATEGORIES_DESPESA[0])
  const [errors, setErrors]           = useState<Record<string, string>>({})

  const categories = type === "receita" ? CATEGORIES_RECEITA : CATEGORIES_DESPESA

  function handleTypeChange(t: TransactionType) {
    setType(t)
    setCategory(t === "receita" ? CATEGORIES_RECEITA[0] : CATEGORIES_DESPESA[0])
  }

  function buildRecorrencia(): string | null {
    if (recTipo === "nunca") return null
    if (recTipo === "D") return "D"
    if (recTipo === "S") return recDiaSemana
    if (recTipo === "M") {
      const dia = customData ? new Date(customData).getDate() + 1 : new Date().getDate()
      return `M${dia}`
    }
    if (recTipo === "A") return `A${recIntervaloDias}`
    return null
  }

  function handleSubmit() {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = "Dê um nome para a transação"
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      newErrors.amount = "Informe um valor válido"
    if (data === "escolher" && !customData)
      newErrors.data = "Escolha uma data"
    if (recTipo === "A" && (!recIntervaloDias || Number(recIntervaloDias) < 1))
      newErrors.rec = "Informe um intervalo válido"
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    const newTransaction: Transaction = {
      id: uuidv4(),
      title,
      amount: Number(amount),
      type,
      data: data === "escolher" && customData
        ? new Date(customData).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        : "Hoje",
      category,
      date: data === "escolher" && customData
        ? customData
        : new Date().toISOString().split("T")[0],
      recorrencia: buildRecorrencia() ?? undefined,
    }

    onAdd(newTransaction)
    onClose()
  }

  const recBtnStyle = (ativo: boolean, cor = "#6366f1") => ({
    flex: 1,
    padding: "8px 0",
    borderRadius: 9,
    border: `1.5px solid ${ativo ? cor : "rgba(255,255,255,0.1)"}`,
    background: ativo ? `${cor}22` : "transparent",
    color: ativo ? cor : "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  } as React.CSSProperties)

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

        {/* Data */}
        <div className={styles.field}>
          <label className={styles.label}>Data</label>
          <div className={styles.typePillGroup}>
            {(["Hoje", "escolher"] as TransactionData[]).map((t) => {
              const cfg = DATA_CONFIG[t]
              return (
                <button
                  key={t}
                  className={styles.typePill}
                  style={data === t ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color } : {}}
                  onClick={() => setData(t)}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
          {data === "escolher" && (
            <div style={{ marginTop: 8 }}>
              <input
                type="date"
                className={`${styles.input} ${errors.data ? styles.inputError : ""}`}
                onChange={(e) => { setCustomData(e.target.value); setErrors((p) => ({ ...p, data: "" })) }}
              />
              {errors.data && <span className={styles.errorMsg}>{errors.data}</span>}
            </div>
          )}
        </div>

        {/* Recorrência */}
        <div className={styles.field}>
          <label className={styles.label}>
            Recorrência <span className={styles.labelOptional}>opcional</span>
          </label>

          {/* Botões principais */}
          <div style={{ display: "flex", gap: 6 }}>
            {([
              { key: "nunca", label: "Nunca"      },
              { key: "D",     label: "Diariamente" },
              { key: "S",     label: "Semanalmente"},
              { key: "M",     label: "Mensalmente" },
              { key: "A",     label: "A cada X dias"},
            ] as { key: RecorrenciaTipo; label: string }[]).map((r) => (
              <button
                key={r.key}
                style={recBtnStyle(recTipo === r.key)}
                onClick={() => setRecTipo(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Dia da semana — aparece só no Semanalmente */}
          {recTipo === "S" && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {DIAS_SEMANA.map((d) => (
                <button
                  key={d.value}
                  style={recBtnStyle(recDiaSemana === d.value, "#8b5cf6")}
                  onClick={() => setRecDiaSemana(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {/* Input de intervalo — aparece só no A cada X dias */}
          {recTipo === "A" && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>A cada</span>
              <input
                type="number"
                min="1"
                max="365"
                className={`${styles.input} ${errors.rec ? styles.inputError : ""}`}
                style={{ width: 80 }}
                value={recIntervaloDias}
                onChange={(e) => { setRecIntervaloDias(e.target.value); setErrors((p) => ({ ...p, rec: "" })) }}
              />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>dias</span>
              {errors.rec && <span className={styles.errorMsg}>{errors.rec}</span>}
            </div>
          )}
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
