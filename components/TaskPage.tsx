"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./TaskPage.module.css"
import TaskCard from "@/components/TaskCard"
import TaskModal from "@/components/TaskModal"
import { Task, FilterType } from "@/types/task"

const INITIAL_TASKS: Task[] = [
  { id: "1", title: "Revisar orçamento mensal",  desc: "Verificar gastos de fevereiro e ajustar categorias", completed: true,  priority: "alta",  tag: "Financeiro", createdAt: "02/03" },
  { id: "2", title: "Reunião com cliente",        desc: "Apresentar proposta do novo projeto",               completed: false, priority: "alta",  tag: "Trabalho",   createdAt: "02/03" },
  { id: "3", title: "Estudar TypeScript avançado",desc: "Focar em generics e utility types",                 completed: false, priority: "media", tag: "Estudos",    createdAt: "01/03" },
]

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: "todas",     label: "Todas"     },
  { key: "pendentes", label: "Pendentes" },
  { key: "concluidas",label: "Concluídas"},
]

export default function TaskPage() {
  const router = useRouter()
  const [tasks, setTasks]       = useState<Task[]>(INITIAL_TASKS)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter]     = useState<FilterType>("todas")

  const pendentes  = tasks.filter((t) => !t.completed).length
  const concluidas = tasks.filter((t) =>  t.completed).length

  const filtered = tasks.filter((t) => {
    if (filter === "pendentes")  return !t.completed
    if (filter === "concluidas") return  t.completed
    return true
  })

  function handleAdd(task: Task) {
    setTasks((prev) => [task, ...prev])
  }

  function handleToggle(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
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
            <h1 className={styles.pageTitle}>Tarefas</h1>
            <p className={styles.pageSubtitle}>
              <span className={styles.pendente}>{pendentes} pendentes</span>
              <span className={styles.separator}>·</span>
              <span className={styles.concluida}>{concluidas} concluídas</span>
            </p>
          </div>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
            <span className={styles.addIcon}>+</span>
            Nova tarefa
          </button>
        </header>

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

        {/* Barra de progresso */}
        <div className={styles.progressWrap}>
          <div
            className={styles.progressBar}
            style={{ width: tasks.length ? `${(concluidas / tasks.length) * 100}%` : "0%" }}
          />
        </div>

        {/* Lista */}
        <div className={styles.taskList}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize: 40 }}>🎉</span>
              <p>Nenhuma tarefa aqui!</p>
            </div>
          ) : (
            filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <TaskModal onClose={() => setModalOpen(false)} onAdd={handleAdd} />
      )}

    </div>
  )
}
