"use client"

import { useEffect, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import HabitoCard from "@/components/HabitoCard"
import styles from "./TaskPage.module.css"
import {
  Habito,
  calcularStreakDoHistorico,
  getTodayISO,
  inferirHistorico,
  normalizarHistorico,
  obterUltimoConcluido,
  toISODate,
} from "@/types/rotina"

function sortByTitle(list: Habito[]): Habito[] {
  return [...list].sort((left, right) => left.title.localeCompare(right.title, "pt-BR"))
}

function parseLocalHabits(): Habito[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem("habitos")
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed as Habito[]
  } catch {
    return []
  }
}

function mergeRemoteWithLocal(remote: Habito[], local: Habito[]): Habito[] {
  const localById = new Map(local.map((habit) => [habit.id, habit]))
  const remoteIds = new Set(remote.map((habit) => habit.id))

  const mergedRemote = remote.map((habit) => {
    const localHabit = localById.get(habit.id)
    const historico = normalizarHistorico(habit.historico?.length ? habit.historico : localHabit?.historico)

    return {
      ...habit,
      historico,
    }
  })

  const onlyLocal = local
    .filter((habit) => !remoteIds.has(habit.id))
    .map((habit) => ({
      ...habit,
      historico: normalizarHistorico(habit.historico),
    }))

  return sortByTitle([...mergedRemote, ...onlyLocal])
}

export default function RotinaView() {
  const [habitos, setHabitos] = useState<Habito[]>(() => sortByTitle(parseLocalHabits()))
  const [novoHabito, setNovoHabito] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const localHabits = parseLocalHabits()

    fetch("/api/rotina")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? (data as Habito[]) : []
        const merged = mergeRemoteWithLocal(list, localHabits)
        setHabitos(merged)
        localStorage.setItem("habitos", JSON.stringify(merged))
      })
      .catch(() => {
        localStorage.setItem("habitos", JSON.stringify(sortByTitle(localHabits)))
      })
  }, [])

  const todayIso = getTodayISO()
  const todayDate = new Date()
  const currentYear = todayDate.getFullYear()
  const currentMonth = todayDate.getMonth()
  const currentDay = todayDate.getDate()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(todayDate)

  const monthDays = Array.from({ length: daysInMonth }, (_, index) => index + 1)

  const historyByHabit = new Map<string, Set<string>>()

  habitos.forEach((habit) => {
    historyByHabit.set(habit.id, new Set(inferirHistorico(habit)))
  })

  const feitosHoje = habitos.filter((habit) => {
    const history = historyByHabit.get(habit.id)
    return history?.has(todayIso) ?? false
  }).length

  const totalHabitos = habitos.length
  const progresso = totalHabitos > 0 ? Math.round((feitosHoje / totalHabitos) * 100) : 0

  const melhorStreak = habitos.reduce((best, habit) => Math.max(best, habit.streak), 0)

  const mediaStreak = totalHabitos
    ? Number(
        (habitos.reduce((accumulator, habit) => accumulator + habit.streak, 0) / totalHabitos).toFixed(1),
      )
    : 0

  const concluidosNoMes = habitos.reduce((total, habit) => {
    const history = historyByHabit.get(habit.id)
    if (!history) return total

    let done = 0

    monthDays.forEach((day) => {
      if (day > currentDay) return

      const monthDate = new Date(currentYear, currentMonth, day)
      if (history.has(toISODate(monthDate))) done += 1
    })

    return total + done
  }, 0)

  const totalSlotsMes = totalHabitos * Math.max(currentDay, 1)
  const consistenciaMes = totalSlotsMes > 0 ? Math.round((concluidosNoMes / totalSlotsMes) * 100) : 0

  const streakRanking = [...habitos]
    .sort((left, right) => {
      if (right.streak !== left.streak) return right.streak - left.streak
      return left.title.localeCompare(right.title, "pt-BR")
    })
    .slice(0, 6)

  function saveHabits(nextHabits: Habito[]) {
    const ordered = sortByTitle(nextHabits)
    setHabitos(ordered)
    localStorage.setItem("habitos", JSON.stringify(ordered))
  }

  async function handleAdd() {
    const title = novoHabito.trim()
    if (!title) return

    const novo: Habito = {
      id: uuidv4(),
      title,
      streak: 0,
      ultimo_concluido: null,
      historico: [],
    }

    try {
      await fetch("/api/rotina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novo),
      })
    } catch {
      // Keep local flow working if API is offline.
    }

    saveHabits([...habitos, novo])
    setNovoHabito("")
    setAdding(false)
  }

  async function handleToggle(id: string) {
    const habit = habitos.find((item) => item.id === id)
    if (!habit) return

    const history = new Set(inferirHistorico(habit))

    if (history.has(todayIso)) history.delete(todayIso)
    else history.add(todayIso)

    const nextHistory = normalizarHistorico(Array.from(history))
    const nextStreak = calcularStreakDoHistorico(nextHistory)
    const nextUltimo = obterUltimoConcluido(nextHistory)

    try {
      await fetch("/api/rotina", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          streak: nextStreak,
          ultimo_concluido: nextUltimo,
          historico: nextHistory,
        }),
      })
    } catch {
      // Keep local flow working if API is offline.
    }

    const updated = habitos.map((item) =>
      item.id === id
        ? {
            ...item,
            streak: nextStreak,
            ultimo_concluido: nextUltimo,
            historico: nextHistory,
          }
        : item,
    )

    saveHabits(updated)
  }

  async function handleDelete(id: string) {
    try {
      await fetch("/api/rotina", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
    } catch {
      // Keep local flow working if API is offline.
    }

    saveHabits(habitos.filter((habit) => habit.id !== id))
  }

  return (
    <div className={styles.rotinaLayout}>
      <section className={styles.rotinaOverviewCard}>
        <div className={styles.rotinaOverviewHeader}>
          <div>
            <h2 className={styles.rotinaOverviewTitle}>Painel de consistencia</h2>
            <p className={styles.rotinaOverviewSubtitle}>Streak e progresso diario de {monthLabel}</p>
          </div>

          <div className={styles.rotinaLegend}>
            <span className={styles.rotinaLegendItem}>
              <span className={`${styles.rotinaLegendDot} ${styles.rotinaDotDone}`} /> Feito
            </span>
            <span className={styles.rotinaLegendItem}>
              <span className={`${styles.rotinaLegendDot} ${styles.rotinaDotMiss}`} /> Nao feito
            </span>
            <span className={styles.rotinaLegendItem}>
              <span className={`${styles.rotinaLegendDot} ${styles.rotinaDotFuture}`} /> Futuro
            </span>
          </div>
        </div>

        <div className={styles.rotinaKpiGrid}>
          <div className={styles.rotinaKpiCard}>
            <p className={styles.rotinaKpiLabel}>Concluidas hoje</p>
            <p className={styles.rotinaKpiValue}>{feitosHoje}/{totalHabitos}</p>
          </div>
          <div className={styles.rotinaKpiCard}>
            <p className={styles.rotinaKpiLabel}>Consistencia do mes</p>
            <p className={styles.rotinaKpiValue}>{consistenciaMes}%</p>
          </div>
          <div className={styles.rotinaKpiCard}>
            <p className={styles.rotinaKpiLabel}>Melhor streak atual</p>
            <p className={styles.rotinaKpiValue}>{melhorStreak} dias</p>
          </div>
          <div className={styles.rotinaKpiCard}>
            <p className={styles.rotinaKpiLabel}>Media de streak</p>
            <p className={styles.rotinaKpiValue}>{mediaStreak} dias</p>
          </div>
        </div>

        <div className={styles.progressWrap}>
          <div className={styles.progressBar} style={{ width: `${progresso}%` }} />
        </div>

        <div className={styles.rotinaHeatmap}>
          <div className={styles.rotinaHeatmapHead}>
            <span className={styles.rotinaHeatmapHeadLabel}>Rotina</span>
            <div className={styles.rotinaDayAxis}>
              {monthDays.map((day) => (
                <span key={`axis-${day}`} className={styles.rotinaDayAxisTick}>
                  {day === 1 || day === currentDay || day % 5 === 0 ? day : ""}
                </span>
              ))}
            </div>
            <span className={styles.rotinaHeatmapHeadLabel}>Mes</span>
          </div>

          {habitos.length === 0 ? (
            <div className={styles.empty}>
              <p>Nenhuma rotina criada ainda.</p>
            </div>
          ) : (
            habitos.map((habit) => {
              const history = historyByHabit.get(habit.id) ?? new Set<string>()

              const doneInMonth = monthDays.reduce((count, day) => {
                if (day > currentDay) return count

                const date = new Date(currentYear, currentMonth, day)
                return history.has(toISODate(date)) ? count + 1 : count
              }, 0)

              return (
                <div key={`map-${habit.id}`} className={styles.rotinaHeatmapRow}>
                  <div className={styles.rotinaHeatmapInfo}>
                    <span className={styles.rotinaHeatmapTitle}>{habit.title}</span>
                    <span className={styles.rotinaHeatmapStreak}>{habit.streak} dias</span>
                  </div>

                  <div className={styles.rotinaDotGrid}>
                    {monthDays.map((day) => {
                      const date = new Date(currentYear, currentMonth, day)
                      const iso = toISODate(date)
                      const isFuture = day > currentDay
                      const done = history.has(iso)

                      const dotClass = done
                        ? styles.rotinaDotDone
                        : isFuture
                          ? styles.rotinaDotFuture
                          : styles.rotinaDotMiss

                      return (
                        <span
                          key={`${habit.id}-${iso}`}
                          className={`${styles.rotinaDot} ${dotClass}`}
                          title={`${habit.title}: ${iso}`}
                        />
                      )
                    })}
                  </div>

                  <span className={styles.rotinaMonthCount}>{doneInMonth}/{currentDay}</span>
                </div>
              )
            })
          )}
        </div>
      </section>

      {streakRanking.length > 0 && (
        <section className={styles.rotinaStreakBoard}>
          <h3 className={styles.statTitle}>Streak das rotinas</h3>
          <div className={styles.rotinaStreakGrid}>
            {streakRanking.map((habit, index) => (
              <div key={`rank-${habit.id}`} className={styles.rotinaStreakCard}>
                <span className={styles.rotinaRankTag}>#{index + 1}</span>
                <span className={styles.rotinaRankTitle}>{habit.title}</span>
                <span className={styles.rotinaRankValue}>{habit.streak} dias</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={styles.taskList}>
        {habitos.map((habit) => (
          <HabitoCard key={habit.id} habito={habit} onToggle={handleToggle} onDelete={handleDelete} />
        ))}

        {adding && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              autoFocus
              className={styles.input}
              placeholder="Ex: academia, leitura, estudo..."
              value={novoHabito}
              onChange={(event) => setNovoHabito(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAdd()
                if (event.key === "Escape") setAdding(false)
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

      {!adding && (
        <button className={styles.addBtn} onClick={() => setAdding(true)}>
          <span className={styles.addIcon}>+</span>
          Nova rotina
        </button>
      )}
    </div>
  )
}
