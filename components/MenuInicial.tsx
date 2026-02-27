"use client"

import styles from "./MenuInicial.module.css"
import { useRouter } from "next/navigation"

type Props = {
  nome: string
  tarefasPendentes: number
}

export default function MenuInicial({ nome, tarefasPendentes }: Props) {
  const router = useRouter()

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <h1 className={styles.title}>Olá, {nome}</h1>

        <p className={styles.subtitle}>
          Você tem {tarefasPendentes} tarefas pendentes para hoje
        </p>

        <div className={styles.buttons}>
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={() => router.push("/tarefas")}
          >
            Ir para Tarefas
          </button>

          <button
            className={`${styles.button} ${styles.secondary}`}
            onClick={() => router.push("/financeiro")}
          >
            Ir para Financeiro
          </button>
        </div>
      </div>
    </div>
  )
}