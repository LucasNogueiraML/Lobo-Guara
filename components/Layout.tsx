"use client"

import styles from "./MenuInicial.module.css"
import { useRouter } from "next/navigation"

type Props = {
  nome: string
  tarefasPendentes: number
}
export default function Layout({ children }: { children: React.ReactNode }) {
      const router = useRouter()
  return (
    <div className={styles.container}>
    <aside className={styles.sideBar}>
        <button className={styles.iconButton}
        onClick={() => router.push("/")}         
        title="Dashboard">
        <img src="/dashboard.svg" alt="DashBoard"/>
        </button>
      <button
        className={styles.iconButton}
        onClick={() => router.push("/tarefas") }
        title="Tarefas"
      >
        <img src="/task.svg" alt="Tarefas" />
      </button>

      <button
        className={styles.iconButton}
        onClick={() => router.push("/financeiro")}
        title="Financeiro"
      >
        <img src="/money.svg" alt="Financeiro" />
      </button>
    </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
