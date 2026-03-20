"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import styles from "./MenuInicial.module.css"
import { calcularResumoTarefas } from "@/app/api/lib/calculo"
import { calcularResumoGeral, calcularPorCategoria } from "@/app/api/lib/calculo"
import { Task } from "@/types/task"
import { Transaction, formatBRL } from "@/types/finance"

export default function MenuInicial() {
  const router = useRouter()
  const { data: session } = useSession()
  const [tasks, setTasks]               = useState<Task[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const localTasks = localStorage.getItem("tasks")
    if (localTasks) setTasks(JSON.parse(localTasks))
    fetch("/api/tasks")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTasks(d) })
      .catch(() => {})

    const localFin = localStorage.getItem("transactions")
    if (localFin) setTransactions(JSON.parse(localFin))
    fetch("/api/financeiro")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTransactions(d) })
      .catch(() => {})
  }, [])

  const resumoTarefas   = calcularResumoTarefas(tasks)
  const resumoFinanceiro = calcularResumoGeral(transactions)
  const categorias      = calcularPorCategoria(transactions)
  const topDespesa      = categorias.find(c => c.type === "despesa")
  const nome            = session?.user?.name?.split(" ")[0] ?? "você"

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return "Bom dia"
    if (h < 18) return "Boa tarde"
    return "Boa noite"
  }

  return (
    <div className={styles.container}>
      <div className={styles.main}>

        {/* TOPBAR */}
        <header className={styles.topBar}>
          <div>
            <h1 className={styles.title}>{saudacao()}, {nome} 👋</h1>
            <p className={styles.subtitle}>
              {resumoTarefas.hoje > 0
                ? `Você tem ${resumoTarefas.hoje} tarefa${resumoTarefas.hoje > 1 ? "s" : ""} para hoje`
                : "Nenhuma tarefa para hoje — aproveite!"}
            </p>
          </div>
        </header>

        {/* DASHBOARD */}
        <main className={styles.dashboard}>

          {/* A — Financeiro resumo */}
          <div className={styles.cardA} onClick={() => router.push("/financeiro")} style={{ cursor: "pointer" }}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Saldo atual</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: resumoFinanceiro.saldoAtual >= 0 ? "#34d399" : "#f87171" }}>
              {formatBRL(Math.abs(resumoFinanceiro.saldoAtual))}
            </p>
            <p style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
              +{formatBRL(resumoFinanceiro.totalReceitas)} receitas · -{formatBRL(resumoFinanceiro.totalDespesas)} despesas
            </p>
          </div>

          {/* B — Tarefas hoje */}
          <div className={styles.cardB} onClick={() => router.push("/tarefas")} style={{ cursor: "pointer" }}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tarefas hoje</p>
            <p style={{ fontSize: 36, fontWeight: 800, color: resumoTarefas.hoje > 0 ? "#f87171" : "#34d399" }}>
              {resumoTarefas.hoje}
            </p>
            <p style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
              {resumoTarefas.amanha} amanhã · {resumoTarefas.semana} esta semana
            </p>
          </div>

          {/* C — Tarefas concluídas */}
          <div className={styles.cardC} onClick={() => router.push("/tarefas")} style={{ cursor: "pointer" }}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Concluídas</p>
            <p style={{ fontSize: 36, fontWeight: 800, color: "#34d399" }}>{resumoTarefas.concluidas}</p>
            <p style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>de {resumoTarefas.total} tarefas</p>
          </div>

          {/* D — Previsão financeira */}
          <div className={styles.cardD} onClick={() => router.push("/financeiro")} style={{ cursor: "pointer" }}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Previsão 3 meses</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: resumoFinanceiro.saldoPrevisto3Meses >= 0 ? "#34d399" : "#f87171" }}>
              {formatBRL(Math.abs(resumoFinanceiro.saldoPrevisto3Meses))}
            </p>
            <p style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
              {resumoFinanceiro.saldoPrevisto3Meses >= 0 ? "Saldo previsto positivo 🎉" : "Atenção aos gastos ⚠️"}
            </p>
          </div>

          {/* E — Maior categoria de despesa */}
          <div className={styles.cardE}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Maior gasto</p>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{resumoFinanceiro.maiorDespesaCategoria}</p>
            {topDespesa && (
              <p style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
                {formatBRL(topDespesa.total)} · {topDespesa.quantidade} transações
              </p>
            )}
          </div>

          {/* F — Tarefas indeterminadas */}
          <div className={styles.cardF} onClick={() => router.push("/tarefas")} style={{ cursor: "pointer" }}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Sem prazo</p>
            <p style={{ fontSize: 36, fontWeight: 800, color: "#fbbf24" }}>{resumoTarefas.indeterminado}</p>
            <p style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>tarefas indeterminadas</p>
          </div>

          {/* G — Dica do dia */}
          <div className={styles.cardG}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Dica</p>
            <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.8 }}>
              {resumoTarefas.amanha > 0
                ? `Você tem ${resumoTarefas.amanha} tarefa${resumoTarefas.amanha > 1 ? "s" : ""} para amanhã. Não deixe para depois! 💪`
                : resumoFinanceiro.saldoAtual < 0
                ? "Seus gastos estão maiores que suas receitas. Hora de revisar o orçamento! 💸"
                : "Tudo sob controle! Continue assim. 🎯"}
            </p>
          </div>

          {/* H — Maior receita */}
          <div className={styles.cardH}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Maior receita</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#34d399" }}>{resumoFinanceiro.maiorReceitaCategoria}</p>
            {categorias.find(c => c.type === "receita") && (
              <p style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
                {formatBRL(categorias.find(c => c.type === "receita")!.total)}
              </p>
            )}
          </div>

          {/* I — Resumo geral */}
          <div className={styles.cardI}>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Resumo geral</p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 11, opacity: 0.4 }}>Tarefas esta semana</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>{resumoTarefas.semana}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, opacity: 0.4 }}>Concluídas</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#34d399" }}>{resumoTarefas.concluidas}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, opacity: 0.4 }}>Saldo do mês</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: resumoFinanceiro.saldoAtual >= 0 ? "#34d399" : "#f87171" }}>
                  {formatBRL(Math.abs(resumoFinanceiro.saldoAtual))}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, opacity: 0.4 }}>Sem prazo</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#fbbf24" }}>{resumoTarefas.indeterminado}</p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
