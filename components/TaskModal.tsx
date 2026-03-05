"use client"

import { useState } from "react"
import styles from "./TaskPage.module.css"
import { Task, PRIORITIES, TAGS, PRIORITY_CONFIG } from "@/types/task"
import { v4 as uuidv4 } from "uuid"

type Props = {
  onClose: () => void
  onAdd: (task: Task) => void
}

export default function TaskModal({ onClose, onAdd }: Props) {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [priority, setPriority] = useState<Task["priority"]>("media")
  const [tag, setTag] = useState(TAGS[0])
  const [error, setError] = useState("")

  function handleSubmit() {
    if (!title.trim()) {
      setError("Dê um nome para a tarefa")
      return
    }

    const newTask: Task = {
      id: uuidv4(),
      title,
      desc,
      priority,
      tag,
      completed: false,
      createdAt: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    }

    onAdd(newTask)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nova tarefa</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Título */}
        <div className={styles.field}>
          <label className={styles.label}>
            Título <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            autoFocus
            className={`${styles.input} ${error ? styles.inputError : ""}`}
            placeholder="Ex: Revisar relatório financeiro..."
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError("") }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          {error && <span className={styles.errorMsg}>{error}</span>}
        </div>

        {/* Descrição */}
        <div className={styles.field}>
          <label className={styles.label}>
            Descrição <span className={styles.labelOptional}>opcional</span>
          </label>
          <textarea
            className={styles.textarea}
            placeholder="Adicione detalhes sobre a tarefa..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
          />
        </div>

        {/* Prioridade + Categoria */}
        <div className={styles.fieldRow}>
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label}>Prioridade</label>
            <div className={styles.pillGroup}>
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_CONFIG[p]
                return (
                  <button
                    key={p}
                    className={styles.pill}
                    style={
                      priority === p
                        ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color }
                        : {}
                    }
                    onClick={() => setPriority(p)}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label}>Categoria</label>
            <select
              className={styles.select}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Ações */}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.submitBtn} onClick={handleSubmit}>Criar tarefa</button>
        </div>

      </div>
    </div>
  )
}
