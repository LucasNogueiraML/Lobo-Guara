"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import styles from "./TaskPage.module.css"
import TaskCard from "@/components/TaskCard"
import TaskModal from "@/components/TaskModal"
import { Task, FilterType } from "@/types/task"

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: "todas",      label: "Todas"     },
  { key: "pendentes",  label: "Pendentes" },
  { key: "concluidas", label: "Concluídas"},
]

export default function TaskPage() {
  const router = useRouter()
  const [tasks, setTasks]         = useState<Task[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter]       = useState<FilterType>("todas")

  // Carrega tarefas: localStorage primeiro (instantâneo), banco depois (atualiza)
  useEffect(() => {
    const local = localStorage.getItem("tasks")
    if (local) setTasks(JSON.parse(local))

    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTasks(data)
        localStorage.setItem("tasks", JSON.stringify(data))
      })
      .catch(() => console.log("Render dormindo, usando dados locais"))
  }, [])

  const pendentes  = tasks.filter((t) => !t.completed).length
  const concluidas = tasks.filter((t) =>  t.completed).length

  const filtered = tasks.filter((t) => {
    if (filter === "pendentes")  return !t.completed
    if (filter === "concluidas") return  t.completed
    return true
  })

  function handleAdd(task: Task) {
    const updated = [task, ...tasks]
    setTasks(updated)
    localStorage.setItem("tasks", JSON.stringify(updated))
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

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>FT</div>
        <button className={styles.sideIcon} onClick={() => router.push("/")}         title="Dashboard">⊞</button>
        <button className={`${styles.sideIcon} ${styles.sideIconActive}`}            title="Tarefas">✓</button>
        <button className={styles.sideIcon} onClick={() => router.push("/financeiro")} title="Financeiro">₿</button>
        <div style={{ flex: 1 }} />
        <button className={styles.sideIcon} title="Configurações">⚙</button>
      </aside>

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
