"use client"

import styles from "./TaskPage.module.css"
import { Task, PRIORITY_CONFIG } from "@/types/task"

type Props = {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function TaskCard({ task, onToggle, onDelete }: Props) {
  const p = PRIORITY_CONFIG[task.priority]

  return (
    <div className={`${styles.taskCard} ${task.completed ? styles.taskCardCompleted : ""}`}>
      <button
        className={`${styles.checkbox} ${task.completed ? styles.checkboxDone : ""}`}
        onClick={() => onToggle(task.id)}
      >
        {task.completed && <span>✓</span>}
      </button>

      <div className={styles.taskContent}>
        <div className={styles.taskMeta}>
          <span className={`${styles.taskTitle} ${task.completed ? styles.taskTitleDone : ""}`}>
            {task.title}
          </span>
          <span
            className={styles.badge}
            style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}40` }}
          >
            {p.label}
          </span>
          <span
            className={styles.badge}
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
          >
            {task.tag}
          </span>
        </div>
        {task.desc && <p className={styles.taskDesc}>{task.desc}</p>}
      </div>

      <div className={styles.taskFooter}>
        <span className={styles.taskDate}>{task.createdAt}</span>
        <button className={styles.deleteBtn} onClick={() => onDelete(task.id)}>✕</button>
      </div>
    </div>
  )
}
