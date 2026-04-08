"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { v4 as uuidv4 } from "uuid"

import styles from "./HomeStart.module.css"
import { CATEGORIES_DESPESA, Transaction } from "@/types/finance"
import { Task } from "@/types/task"

type QuickPanel = "task" | "expense" | null

function parseStorageList<T>(key: string): T[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export default function HomeStart() {
  const router = useRouter()
  const { data: session } = useSession()

  const [openPanel, setOpenPanel] = useState<QuickPanel>(null)
  const [taskTitle, setTaskTitle] = useState("")
  const [expenseTitle, setExpenseTitle] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseCategory, setExpenseCategory] = useState(CATEGORIES_DESPESA[CATEGORIES_DESPESA.length - 1] ?? "Outros")
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState("")

  const nome = session?.user?.name?.split(" ")[0] ?? "Lucas"

  const saudacao = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }, [])

  function setMessage(nextFeedback: string, nextError = "") {
    setFeedback(nextFeedback)
    setError(nextError)
  }

  function togglePanel(panel: Exclude<QuickPanel, null>) {
    setMessage("")
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  async function handleQuickTask() {
    const title = taskTitle.trim()
    if (!title) {
      setMessage("", "Informe o nome da tarefa.")
      return
    }

    const todayISO = new Date().toISOString().split("T")[0]
    const newTask: Task = {
      id: uuidv4(),
      title,
      desc: "",
      completed: false,
      priority: "media",
      tag: "Pessoal",
      createdAt: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      data: todayISO,
    }

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    })

    if (!response.ok) {
      setMessage("", "Nao consegui salvar a tarefa agora.")
      return
    }

    const tasks = parseStorageList<Task>("tasks")
    window.localStorage.setItem("tasks", JSON.stringify([newTask, ...tasks]))

    setTaskTitle("")
    setMessage("Tarefa adicionada com sucesso.")
  }

  async function handleQuickExpense() {
    const title = expenseTitle.trim()
    const amount = Number(expenseAmount)

    if (!title) {
      setMessage("", "Informe a descricao do gasto.")
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("", "Informe um valor valido.")
      return
    }

    const newTransaction: Transaction = {
      id: uuidv4(),
      title,
      amount,
      type: "despesa",
      data: "Hoje",
      category: expenseCategory,
      date: new Date().toISOString().split("T")[0],
      recorrencia: null,
    }

    const transactions = parseStorageList<Transaction>("transactions")
    window.localStorage.setItem("transactions", JSON.stringify([newTransaction, ...transactions]))

    try {
      const response = await fetch("/api/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTransaction),
      })

      if (!response.ok) {
        setMessage("Gasto salvo localmente, sem sincronizacao com banco agora.")
        return
      }
    } catch {
      setMessage("Gasto salvo localmente, sem conexao com banco agora.")
      return
    }

    setExpenseTitle("")
    setExpenseAmount("")
    setMessage("Gasto adicionado com sucesso.")
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>{saudacao}, {nome}</h1>
          <p className={styles.subtitle}>Tudo pronto para voce seguir o plano de hoje.</p>
        </section>

        <section className={styles.actionRow}>
          <button
            className={`${styles.quickBtn} ${openPanel === "task" ? styles.quickBtnActive : ""}`}
            onClick={() => togglePanel("task")}
          >
            Adicionar tarefa
          </button>

          <button className={styles.dashboardBtn} onClick={() => router.push("/dashboard")}>
            Dashboard
          </button>

          <button
            className={`${styles.quickBtn} ${openPanel === "expense" ? styles.quickBtnActive : ""}`}
            onClick={() => togglePanel("expense")}
          >
            Adicionar gasto
          </button>
        </section>

        {openPanel === "task" && (
          <section className={styles.quickPanel}>
            <h2 className={styles.quickPanelTitle}>Atalho rapido de tarefa</h2>
            <p className={styles.quickPanelHint}>Cria uma tarefa agora com prioridade media.</p>

            <div className={`${styles.formRow} ${styles.formRowTask}`}>
              <input
                className={styles.input}
                value={taskTitle}
                placeholder="Ex: revisar propostas de hoje"
                onChange={(event) => {
                  setTaskTitle(event.target.value)
                  setMessage("")
                }}
              />
              <button className={styles.submitBtn} onClick={handleQuickTask}>
                Salvar tarefa
              </button>
            </div>
          </section>
        )}

        {openPanel === "expense" && (
          <section className={styles.quickPanel}>
            <h2 className={styles.quickPanelTitle}>Atalho rapido de gasto</h2>
            <p className={styles.quickPanelHint}>Registra uma despesa sem abrir a pagina financeira.</p>

            <div className={styles.formRow}>
              <input
                className={styles.input}
                value={expenseTitle}
                placeholder="Ex: mercado, uber, assinatura..."
                onChange={(event) => {
                  setExpenseTitle(event.target.value)
                  setMessage("")
                }}
              />
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={expenseAmount}
                placeholder="Valor (R$)"
                onChange={(event) => {
                  setExpenseAmount(event.target.value)
                  setMessage("")
                }}
              />
              <select
                className={styles.select}
                value={expenseCategory}
                onChange={(event) => setExpenseCategory(event.target.value)}
              >
                {CATEGORIES_DESPESA.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.formRow} ${styles.formRowTask}`}>
              <button className={styles.submitBtn} onClick={handleQuickExpense}>
                Salvar gasto
              </button>
            </div>
          </section>
        )}

        {(feedback || error) && (
          <p className={`${styles.feedback} ${error ? styles.error : ""}`}>
            {error || feedback}
          </p>
        )}
      </main>
    </div>
  )
}
