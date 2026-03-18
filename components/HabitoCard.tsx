"use client"

import { Habito, isConcluidoHoje } from "@/types/rotina"
import styles from "./TaskPage.module.css"

type Props = {
  habito: Habito
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function HabitoCard({ habito, onToggle, onDelete }: Props) {
  const feito = isConcluidoHoje(habito)

  return (
    <div className={`${styles.taskCard} ${feito ? styles.taskCardCompleted : ""}`}>

      {/* Checkbox */}
      <button
        className={`${styles.checkbox} ${feito ? styles.checkboxDone : ""}`}
        onClick={() => onToggle(habito.id)}
      >
        {feito && <span>✓</span>}
      </button>

      {/* Conteúdo */}
      <div className={styles.taskContent}>
        <div className={styles.taskMeta}>
          <span className={`${styles.taskTitle} ${feito ? styles.taskTitleDone : ""}`}>
            {habito.title}
          </span>

          {/* Badge streak */}
          {habito.streak > 0 && (
            <span
              className={styles.badge}
              style={{
                background: habito.streak >= 7
                  ? "rgba(251,191,36,0.15)"
                  : "rgba(99,102,241,0.15)",
                color: habito.streak >= 7 ? "#fbbf24" : "#818cf8",
                border: `1px solid ${habito.streak >= 7 ? "#fbbf2440" : "#818cf840"}`,
              }}
            >
              🔥 {habito.streak} {habito.streak === 1 ? "dia" : "dias"}
            </span>
          )}
        </div>
        <p className={styles.taskDesc}>
          {feito ? "Concluído hoje!" : "Pendente para hoje"}
        </p>
      </div>

      {/* Deletar */}
      <div className={styles.taskFooter}>
        <button className={styles.deleteBtn} onClick={() => onDelete(habito.id)}>✕</button>
      </div>

    </div>
  )
}
