"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import styles from "./TaskPage.module.css"
import TaskCard from "@/components/TaskCard"
import TaskModal from "@/components/TaskModal"
import RotinaView from "@/components/RotinaView"
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
  const [view, setView]           = useState<"tarefas" | "rotina">("tarefas")

  useEffect(() => {
    const local = localStorage.getItem("tasks")
    if (local) setTasks(JSON.parse(local))

    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setTasks(list)
        localStorage.setItem("tasks", JSON.stringify(list))
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

  async function handleToggle(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: !task.completed }),
    })
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  async function handleDelete(id: string) {
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
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
            <h1
              className={styles.pageTitle}
              onClick={() => setView(v => v === "tarefas" ? "rotina" : "tarefas")}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              {view === "tarefas" ? "Tarefas ↕" : "Rotina ↕"}
            </h1>

            {/* Subtítulo muda conforme a view */}
            {view === "tarefas" && (
              <p className={styles.pageSubtitle}>
                <span className={styles.pendente}>{pendentes} pendentes</span>
                <span className={styles.separator}>·</span>
                <span className={styles.concluida}>{concluidas} concluídas</span>
              </p>
            )}
          </div>

          {/* Botão só aparece na view de tarefas */}
          {view === "tarefas" && (
            <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
              <span className={styles.addIcon}>+</span>
              Nova tarefa
            </button>
          )}
        </header>

        {/* VIEW TAREFAS */}
        {view === "tarefas" && (
          <>
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

            {/* Lista de tarefas */}
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
          </>
        )}

        {/* VIEW ROTINA */}
        {view === "rotina" && <RotinaView />}

      </main>

      {/* Modal — só abre na view de tarefas */}
      {modalOpen && (
        <TaskModal onClose={() => setModalOpen(false)} onAdd={handleAdd} />
      )}

    </div>
  )
}
