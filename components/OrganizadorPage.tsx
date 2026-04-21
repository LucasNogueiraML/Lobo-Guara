"use client"

import { DragEvent, useEffect, useMemo, useState } from "react"

import styles from "./OrganizadorPage.module.css"
import { Habito } from "@/types/rotina"
import { Task } from "@/types/task"

type PlannerSourceType = "task" | "routine"

type PlannerBlock = {
  id: string
  title: string
  sourceType: PlannerSourceType
  sourceId: string
  startMin: number
  durationMin: number
}

type RoutineDefault = {
  routineId: string
  title: string
  startMin: number
  durationMin: number
}

type PlannerStorage = {
  plansByDate: Record<string, PlannerBlock[]>
  routineDefaults: RoutineDefault[]
}

const STORAGE_KEY = "planner-day-v1"
const SLOT_MINUTES = 30
const ROW_HEIGHT = 34
const MAX_MINUTES = 24 * 60

function toISODateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalTasks(): Task[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem("tasks")
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Task[]) : []
  } catch {
    return []
  }
}

function parseLocalHabits(): Habito[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem("habitos")
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Habito[]) : []
  } catch {
    return []
  }
}

function formatTimeFromMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.min(totalMinutes, MAX_MINUTES))
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function clampStart(startMin: number, durationMin: number): number {
  const maxStart = Math.max(0, MAX_MINUTES - durationMin)
  return Math.max(0, Math.min(startMin, maxStart))
}

function normalizeDuration(durationMin: number): number {
  const rounded = Math.max(SLOT_MINUTES, Math.round(durationMin / SLOT_MINUTES) * SLOT_MINUTES)
  return Math.min(8 * 60, rounded)
}

function extractDragPayload(event: DragEvent): { kind: "library" | "block"; payload: string } | null {
  const libraryPayload = event.dataTransfer.getData("application/planner-library")
  if (libraryPayload) return { kind: "library", payload: libraryPayload }

  const blockPayload = event.dataTransfer.getData("application/planner-block")
  if (blockPayload) return { kind: "block", payload: blockPayload }

  return null
}

export default function OrganizadorPage() {
  const todayISO = toISODateLocal(new Date())
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [tasks, setTasks] = useState<Task[]>(() => parseLocalTasks())
  const [habits, setHabits] = useState<Habito[]>(() => parseLocalHabits())
  const [plansByDate, setPlansByDate] = useState<Record<string, PlannerBlock[]>>({})
  const [routineDefaults, setRoutineDefaults] = useState<RoutineDefault[]>([])
  const [dragOverStart, setDragOverStart] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        setHydrated(true)
        return
      }

      const parsed = JSON.parse(raw) as PlannerStorage
      setPlansByDate(parsed?.plansByDate ?? {})
      setRoutineDefaults(Array.isArray(parsed?.routineDefaults) ? parsed.routineDefaults : [])
    } catch {
      setPlansByDate({})
      setRoutineDefaults([])
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    const localTasks = parseLocalTasks()
    const localHabits = parseLocalHabits()

    fetch("/api/tasks")
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar tarefas")
        return response.json()
      })
      .then((data) => {
        const remote = Array.isArray(data) ? (data as Task[]) : []
        const remoteIds = new Set(remote.map((item) => item.id))
        const onlyLocal = localTasks.filter((item) => !remoteIds.has(item.id))
        const merged = [...remote, ...onlyLocal]
        setTasks(merged)
        localStorage.setItem("tasks", JSON.stringify(merged))
      })
      .catch(() => {
        setTasks(localTasks)
      })

    fetch("/api/rotina")
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar rotinas")
        return response.json()
      })
      .then((data) => {
        const remote = Array.isArray(data) ? (data as Habito[]) : []
        const remoteIds = new Set(remote.map((item) => item.id))
        const onlyLocal = localHabits.filter((item) => !remoteIds.has(item.id))
        const merged = [...remote, ...onlyLocal]
        setHabits(merged)
        localStorage.setItem("habitos", JSON.stringify(merged))
      })
      .catch(() => {
        setHabits(localHabits)
      })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const payload: PlannerStorage = { plansByDate, routineDefaults }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [plansByDate, routineDefaults, hydrated])

  function buildSeededPlanForDate(dateValue: string): PlannerBlock[] {
    return routineDefaults.map((item) => ({
      id: `plan-${dateValue}-${item.routineId}`,
      title: item.title,
      sourceType: "routine" as const,
      sourceId: item.routineId,
      startMin: clampStart(item.startMin, item.durationMin),
      durationMin: normalizeDuration(item.durationMin),
    }))
  }

  const dayPlan = plansByDate[selectedDate] ?? buildSeededPlanForDate(selectedDate)
  const sortedDayPlan = useMemo(
    () => [...dayPlan].sort((left, right) => left.startMin - right.startMin || left.title.localeCompare(right.title)),
    [dayPlan],
  )

  const slots = useMemo(
    () =>
      Array.from({ length: MAX_MINUTES / SLOT_MINUTES }, (_, index) => {
        const startMin = index * SLOT_MINUTES
        const showLabel = startMin % 60 === 0
        return {
          index,
          startMin,
          label: showLabel ? formatTimeFromMinutes(startMin) : "",
        }
      }),
    [],
  )

  const overlapCount = useMemo(() => {
    let overlaps = 0
    const ordered = [...dayPlan].sort((a, b) => a.startMin - b.startMin)
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const currentEnd = ordered[index].startMin + ordered[index].durationMin
      if (currentEnd > ordered[index + 1].startMin) overlaps += 1
    }
    return overlaps
  }, [dayPlan])

  const totalPlannedMinutes = useMemo(
    () => dayPlan.reduce((sum, block) => sum + block.durationMin, 0),
    [dayPlan],
  )

  function updateDayPlan(updater: (current: PlannerBlock[]) => PlannerBlock[]) {
    setPlansByDate((prev) => {
      const current = prev[selectedDate] ?? buildSeededPlanForDate(selectedDate)
      return {
        ...prev,
        [selectedDate]: updater(current),
      }
    })
  }

  function syncRoutineDefault(block: PlannerBlock) {
    if (block.sourceType !== "routine") return

    setRoutineDefaults((prev) => {
      const index = prev.findIndex((item) => item.routineId === block.sourceId)
      if (index < 0) return prev

      const next = [...prev]
      next[index] = {
        ...next[index],
        title: block.title,
        startMin: block.startMin,
        durationMin: block.durationMin,
      }
      return next
    })
  }

  function addBlockFromLibrary(
    sourceType: PlannerSourceType,
    sourceId: string,
    title: string,
    slotStart: number,
    durationMin = 60,
  ) {
    const normalizedDuration = normalizeDuration(durationMin)
    const startMin = clampStart(slotStart, normalizedDuration)

    const block: PlannerBlock = {
      id: `block-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      title,
      sourceType,
      sourceId,
      startMin,
      durationMin: normalizedDuration,
    }

    updateDayPlan((current) => [...current, block])
  }

  function moveBlock(blockId: string, slotStart: number) {
    updateDayPlan((current) =>
      current.map((block) => {
        if (block.id !== blockId) return block

        const moved = {
          ...block,
          startMin: clampStart(slotStart, block.durationMin),
        }

        syncRoutineDefault(moved)
        return moved
      }),
    )
  }

  function updateBlockDuration(blockId: string, durationMin: number) {
    updateDayPlan((current) =>
      current.map((block) => {
        if (block.id !== blockId) return block

        const nextDuration = normalizeDuration(durationMin)
        const updated = {
          ...block,
          durationMin: nextDuration,
          startMin: clampStart(block.startMin, nextDuration),
        }

        syncRoutineDefault(updated)
        return updated
      }),
    )
  }

  function toggleRoutineRepeat(block: PlannerBlock) {
    if (block.sourceType !== "routine") return

    setRoutineDefaults((prev) => {
      const exists = prev.find((item) => item.routineId === block.sourceId)
      if (exists) {
        return prev.filter((item) => item.routineId !== block.sourceId)
      }

      return [
        ...prev,
        {
          routineId: block.sourceId,
          title: block.title,
          startMin: block.startMin,
          durationMin: block.durationMin,
        },
      ]
    })
  }

  function removeBlock(blockId: string) {
    updateDayPlan((current) => current.filter((block) => block.id !== blockId))
  }

  function handleDropOnSlot(event: DragEvent<HTMLDivElement>, slotStart: number) {
    event.preventDefault()
    const payload = extractDragPayload(event)
    setDragOverStart(null)

    if (!payload) return

    if (payload.kind === "block") {
      moveBlock(payload.payload, slotStart)
      return
    }

    try {
      const parsed = JSON.parse(payload.payload) as {
        sourceType: PlannerSourceType
        sourceId: string
        title: string
        durationMin?: number
      }
      addBlockFromLibrary(parsed.sourceType, parsed.sourceId, parsed.title, slotStart, parsed.durationMin ?? 60)
    } catch {
      // Ignore invalid payloads.
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Organizador do dia</h1>
            <p className={styles.subtitle}>Monte seu dia em 24h como blocos lego de tarefas e rotinas.</p>
          </div>
          <div className={styles.dateWrap}>
            <label className={styles.dateLabel}>Dia do plano</label>
            <input
              className={styles.dateInput}
              type="date"
              min={todayISO}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
        </header>

        <section className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Horas planejadas</p>
            <p className={styles.kpiValue}>{(totalPlannedMinutes / 60).toFixed(1)}h</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Horas livres</p>
            <p className={styles.kpiValue}>{Math.max(0, (24 * 60 - totalPlannedMinutes) / 60).toFixed(1)}h</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Conflitos no dia</p>
            <p className={`${styles.kpiValue} ${overlapCount > 0 ? styles.warning : styles.good}`}>{overlapCount}</p>
          </div>
        </section>

        <section className={styles.layoutGrid}>
          <aside className={styles.library}>
            <div className={styles.libraryCard}>
              <h3 className={styles.sectionTitle}>Peças de tarefas</h3>
              <p className={styles.sectionHint}>Arraste para um horário da grade (duração inicial: 1h).</p>

              <div className={styles.pieceList}>
                {tasks.length === 0 ? (
                  <p className={styles.empty}>Sem tarefas para usar como peça.</p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={`task-piece-${task.id}`}
                      className={styles.piece}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "application/planner-library",
                          JSON.stringify({
                            sourceType: "task",
                            sourceId: task.id,
                            title: task.title,
                            durationMin: 60,
                          }),
                        )
                      }}
                    >
                      <strong>{task.title}</strong>
                      <span>Tarefa</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.libraryCard}>
              <h3 className={styles.sectionTitle}>Peças de rotina</h3>
              <p className={styles.sectionHint}>Somente rotinas podem virar repetição diária.</p>

              <div className={styles.pieceList}>
                {habits.length === 0 ? (
                  <p className={styles.empty}>Sem rotinas para usar como peça.</p>
                ) : (
                  habits.map((habit) => (
                    <div
                      key={`habit-piece-${habit.id}`}
                      className={styles.piece}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "application/planner-library",
                          JSON.stringify({
                            sourceType: "routine",
                            sourceId: habit.id,
                            title: habit.title,
                            durationMin: 60,
                          }),
                        )
                      }}
                    >
                      <strong>{habit.title}</strong>
                      <span>Rotina</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className={styles.timeline}>
            <div className={styles.timelineHeader}>
              <h3 className={styles.sectionTitle}>Timeline 24h ({selectedDate})</h3>
              <p className={styles.sectionHint}>Arraste blocos para reposicionar. Ajuste duração e repetição dentro do bloco.</p>
            </div>

            <div className={styles.timelineBody}>
              <div className={styles.timeAxis}>
                {slots.map((slot) => (
                  <div key={`axis-${slot.startMin}`} className={styles.timeTick}>
                    {slot.label}
                  </div>
                ))}
              </div>

              <div className={styles.canvas}>
                {slots.map((slot) => (
                  <div
                    key={`drop-${slot.startMin}`}
                    className={`${styles.dropZone} ${dragOverStart === slot.startMin ? styles.dropZoneActive : ""}`}
                    style={{ top: slot.index * ROW_HEIGHT, height: ROW_HEIGHT }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragOverStart(slot.startMin)
                    }}
                    onDragLeave={() => setDragOverStart((current) => (current === slot.startMin ? null : current))}
                    onDrop={(event) => handleDropOnSlot(event, slot.startMin)}
                  />
                ))}

                {sortedDayPlan.map((block) => {
                  const start = clampStart(block.startMin, block.durationMin)
                  const height = Math.max(ROW_HEIGHT - 4, (normalizeDuration(block.durationMin) / SLOT_MINUTES) * ROW_HEIGHT - 4)
                  const isRepeating = block.sourceType === "routine" && routineDefaults.some((item) => item.routineId === block.sourceId)
                  const endMin = start + normalizeDuration(block.durationMin)

                  return (
                    <div
                      key={block.id}
                      className={`${styles.block} ${block.sourceType === "routine" ? styles.blockRoutine : styles.blockTask}`}
                      style={{ top: (start / SLOT_MINUTES) * ROW_HEIGHT + 2, height }}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/planner-block", block.id)
                      }}
                    >
                      <div className={styles.blockHeader}>
                        <strong className={styles.blockTitle}>{block.title}</strong>
                        <button className={styles.iconBtn} onClick={() => removeBlock(block.id)} title="Remover do dia">
                          ✕
                        </button>
                      </div>
                      <p className={styles.blockTime}>
                        {formatTimeFromMinutes(start)} - {formatTimeFromMinutes(endMin)}
                      </p>

                      <div className={styles.blockControls}>
                        <select
                          className={styles.durationSelect}
                          value={normalizeDuration(block.durationMin)}
                          onChange={(event) => updateBlockDuration(block.id, Number(event.target.value))}
                        >
                          {[30, 60, 90, 120, 150, 180, 240].map((minutes) => (
                            <option key={`${block.id}-dur-${minutes}`} value={minutes}>
                              {minutes} min
                            </option>
                          ))}
                        </select>

                        {block.sourceType === "routine" && (
                          <button
                            className={`${styles.repeatBtn} ${isRepeating ? styles.repeatActive : ""}`}
                            onClick={() => toggleRoutineRepeat(block)}
                            title={isRepeating ? "Parar repetição diária dessa rotina" : "Repetir diariamente essa rotina"}
                          >
                            🔁 {isRepeating ? "Repetindo" : "Repetir"}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}
