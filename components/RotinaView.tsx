"use client"

import { useEffect, useRef, useState } from "react"
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

function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function parseMonthKey(monthKey: string): Date | null {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)

  if (month < 1 || month > 12) return null
  return new Date(year, month - 1, 1)
}

function formatMonthKeyLabel(monthKey: string): string {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return monthKey

  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(parsed)
}

function extractMonthKey(isoDate: string): string | null {
  if (!isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) return null
  return isoDate.slice(0, 7)
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

  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayIso = getTodayISO()
  const currentMonthKey = monthKeyFromDate(todayDate)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)
  const monthPickerRef = useRef<HTMLDivElement | null>(null)

  const historyByHabit = new Map<string, Set<string>>()
  habitos.forEach((habit) => {
    historyByHabit.set(habit.id, new Set(inferirHistorico(habit)))
  })

  const monthSet = new Set<string>([currentMonthKey])
  historyByHabit.forEach((history) => {
    history.forEach((isoDate) => {
      const monthKey = extractMonthKey(isoDate)
      if (monthKey) monthSet.add(monthKey)
    })
  })

  const availableMonths = Array.from(monthSet).sort((left, right) => right.localeCompare(left)).slice(0, 36)
  const activeMonth = availableMonths.includes(selectedMonth) ? selectedMonth : currentMonthKey
  const selectedDate = parseMonthKey(activeMonth) ?? new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  const selectedYear = selectedDate.getFullYear()
  const selectedMonthIndex = selectedDate.getMonth()
  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate()
  const monthLabel = formatMonthKeyLabel(activeMonth)
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => index + 1)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!monthPickerRef.current) return
      if (monthPickerRef.current.contains(event.target as Node)) return
      setMonthMenuOpen(false)
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const totalHabitos = habitos.length
  const feitosHoje = habitos.filter((habit) => {
    const history = historyByHabit.get(habit.id)
    return history?.has(todayIso) ?? false
  }).length
  const progressoHoje = totalHabitos > 0 ? Math.round((feitosHoje / totalHabitos) * 100) : 0
  const isCurrentMonthSelected = activeMonth === currentMonthKey
  const daysElapsedInMonth = activeMonth < currentMonthKey ? daysInMonth : isCurrentMonthSelected ? todayDate.getDate() : 0

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
      const monthDate = new Date(selectedYear, selectedMonthIndex, day)
      if (monthDate.getTime() > todayDate.getTime()) return

      if (history.has(toISODate(monthDate))) done += 1
    })

    return total + done
  }, 0)

  const totalSlotsMes = totalHabitos * daysElapsedInMonth
  const consistenciaMes = totalSlotsMes > 0 ? Math.round((concluidosNoMes / totalSlotsMes) * 100) : 0
  const progresso = isCurrentMonthSelected ? progressoHoje : consistenciaMes
  const firstKpiLabel = isCurrentMonthSelected ? "Concluidas hoje" : "Concluidas no mes"
  const firstKpiValue = isCurrentMonthSelected ? `${feitosHoje}/${totalHabitos}` : `${concluidosNoMes}/${totalSlotsMes}`
  const axisHighlightDay = daysElapsedInMonth > 0 ? daysElapsedInMonth : daysInMonth

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

  async function updateHabitHistory(id: string, nextHistory: string[]) {
    const nextStreak = calcularStreakDoHistorico(nextHistory)
    const nextUltimo = obterUltimoConcluido(nextHistory)

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
  }

  async function handleToggleDate(id: string, isoDate: string) {
    const habit = habitos.find((item) => item.id === id)
    if (!habit) return

    const history = new Set(inferirHistorico(habit))

    if (history.has(isoDate)) history.delete(isoDate)
    else history.add(isoDate)

    const nextHistory = normalizarHistorico(Array.from(history))
    await updateHabitHistory(id, nextHistory)
  }

  async function handleToggle(id: string) {
    await handleToggleDate(id, todayIso)
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
          <div className={styles.rotinaOverviewMain}>
            <h2 className={styles.rotinaOverviewTitle}>Painel de consistencia</h2>
            <div className={styles.rotinaMonthPickerWrap} ref={monthPickerRef}>
              <button
                type="button"
                className={styles.rotinaMonthPickerButton}
                onClick={() => setMonthMenuOpen((current) => !current)}
              >
                {monthLabel}
                <span className={styles.rotinaMonthPickerCaret}>▾</span>
              </button>

              {monthMenuOpen && (
                <div className={styles.rotinaMonthPickerMenu}>
                  {availableMonths.map((monthKey) => (
                    <button
                      key={monthKey}
                      type="button"
                      className={`${styles.rotinaMonthOption} ${
                        monthKey === activeMonth ? styles.rotinaMonthOptionActive : ""
                      }`}
                      onClick={() => {
                        setSelectedMonth(monthKey)
                        setMonthMenuOpen(false)
                      }}
                    >
                      {formatMonthKeyLabel(monthKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className={styles.rotinaOverviewSubtitle}>Streak e progresso do mes selecionado</p>
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
            <p className={styles.rotinaKpiLabel}>{firstKpiLabel}</p>
            <p className={styles.rotinaKpiValue}>{firstKpiValue}</p>
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
                  {day === 1 || day === axisHighlightDay || day % 5 === 0 ? day : ""}
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
                const date = new Date(selectedYear, selectedMonthIndex, day)
                if (date.getTime() > todayDate.getTime()) return count

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
                      const date = new Date(selectedYear, selectedMonthIndex, day)
                      const iso = toISODate(date)
                      const isFuture = date.getTime() > todayDate.getTime()
                      const done = history.has(iso)

                      const dotClass = done
                        ? styles.rotinaDotDone
                        : isFuture
                          ? styles.rotinaDotFuture
                          : styles.rotinaDotMiss

                      return (
                        <button
                          key={`${habit.id}-${iso}`}
                          type="button"
                          aria-pressed={done}
                          disabled={isFuture}
                          onClick={() => {
                            if (isFuture) return
                            handleToggleDate(habit.id, iso)
                          }}
                          className={`${styles.rotinaDotButton} ${styles.rotinaDot} ${dotClass} ${
                            isFuture ? styles.rotinaDotDisabled : ""
                          }`}
                          title={
                            isFuture
                              ? `${habit.title}: ${iso} (futuro)`
                              : `${habit.title}: ${iso} - clique para marcar/desmarcar`
                          }
                        >
                          {done && <span className={styles.rotinaDotCheck}>✓</span>}
                        </button>
                      )
                    })}
                  </div>

                  <span className={styles.rotinaMonthCount}>{doneInMonth}/{daysElapsedInMonth}</span>
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
