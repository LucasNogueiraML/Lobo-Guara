"use client"

import { useState, useEffect } from "react"
import styles from "./TaskPage.module.css"
import HabitoCard from "@/components/HabitoCard"
import { Habito, isConcluidoHoje, calcularStreak } from "@/types/rotina"
import { v4 as uuidv4 } from "uuid"

export default function RotinaView() {
  const [habitos, setHabitos]       = useState<Habito[]>([])
  const [novoHabito, setNovoHabito] = useState("")
  const [adding, setAdding]         = useState(false)

  useEffect(() => {
    const local = localStorage.getItem("habitos")
    if (local) setHabitos(JSON.parse(local))

    fetch("/api/rotina")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setHabitos(list)
        localStorage.setItem("habitos", JSON.stringify(list))
      })
      .catch(() => console.log("Usando dados locais"))
  }, [])

  const feitos   = habitos.filter((h) => isConcluidoHoje(h)).length
  const total    = habitos.length
  const progresso = total ? Math.round((feitos / total) * 100) : 0

  async function handleAdd() {
    if (!novoHabito.trim()) return

    const novo: Habito = {
      id: uuidv4(),
      title: novoHabito.trim(),
      streak: 0,
      ultimo_concluido: null,
    }

    await fetch("/api/rotina", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo),
    })

    const updated = [...habitos, novo]
    setHabitos(updated)
    localStorage.setItem("habitos", JSON.stringify(updated))
    setNovoHabito("")
    setAdding(false)
  }

  async function handleToggle(id: string) {
    const habito = habitos.find((h) => h.id === id)
    if (!habito) return

    const jaFeitoHoje = isConcluidoHoje(habito)
    const hoje = new Date().toISOString().split("T")[0]

    const novoStreak = jaFeitoHoje ? habito.streak - 1 : calcularStreak(habito, true)
    const novoUltimo = jaFeitoHoje ? null : hoje

    await fetch("/api/rotina", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, streak: novoStreak, ultimo_concluido: novoUltimo }),
    })

    const updated = habitos.map((h) =>
      h.id === id ? { ...h, streak: novoStreak, ultimo_concluido: novoUltimo } : h
    )
    setHabitos(updated)
    localStorage.setItem("habitos", JSON.stringify(updated))
  }

  async function handleDelete(id: string) {
    await fetch("/api/rotina", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const updated = habitos.filter((h) => h.id !== id)
    setHabitos(updated)
    localStorage.setItem("habitos", JSON.stringify(updated))
  }

  return (
    <>
      {/* Subtítulo */}
      <p className={styles.pageSubtitle}>
        <span style={{ color: "#818cf8" }}>{feitos}/{total} hábitos hoje</span>
        {habitos.some((h) => h.streak >= 7) && (
          <>
            <span className={styles.separator}>·</span>
            <span style={{ color: "#fbbf24" }}>🔥 Você está em chamas!</span>
          </>
        )}
      </p>

      {/* Barra de progresso */}
      <div className={styles.progressWrap} style={{ marginTop: 16 }}>
        <div className={styles.progressBar} style={{ width: `${progresso}%` }} />
      </div>

      {/* Lista de hábitos */}
      <div className={styles.taskList} style={{ marginTop: 24 }}>
        {habitos.length === 0 && !adding && (
          <div className={styles.empty}>
            <span style={{ fontSize: 40 }}>🌱</span>
            <p>Nenhum hábito ainda. Crie o primeiro!</p>
          </div>
        )}

        {habitos.map((h) => (
          <HabitoCard
            key={h.id}
            habito={h}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}

        {/* Input inline para novo hábito */}
        {adding && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              autoFocus
              className={styles.input}
              placeholder="Ex: Ir à academia, Ler 30 min..."
              value={novoHabito}
              onChange={(e) => setNovoHabito(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
                if (e.key === "Escape") setAdding(false)
              }}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid rgba(99,102,241,0.5)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={handleAdd}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "white",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Salvar
            </button>
            <button
              onClick={() => setAdding(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Botão adicionar hábito — aparece no lugar do modal */}
      {!adding && (
        <button
          className={styles.addBtn}
          style={{ marginTop: 20 }}
          onClick={() => setAdding(true)}
        >
          <span className={styles.addIcon}>+</span>
          Novo hábito
        </button>
      )}
    </>
  )
}
