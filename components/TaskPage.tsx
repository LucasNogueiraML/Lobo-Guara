"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import styles from "./TaskPage.module.css"
import TaskCard from "@/components/TaskCard"
import TaskModal from "@/components/TaskModal"
import { FilterType, Task } from "@/types/task"

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendentes", label: "Pendentes" },
  { key: "concluidas", label: "Concluidas" },
]

type MonthlyPoint = {
  mes: string
  total: number
  concluidas: number
  pendentes: number
  taxaConclusao: number
}

type PiePoint = {
  name: string
  value: number
  color: string
  displayValue?: number
}

type PriorityPoint = {
  prioridade: string
  total: number
  concluidas: number
  pendentes: number
}

type TagPoint = {
  tag: string
  total: number
  concluidas: number
  pendentes: number
}

function parseMonthIndex(value?: string): number | null {
  if (!value) return null

  const normalized = value.trim()
  if (!normalized) return null

  const slashDate = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/)
  if (slashDate) {
    const month = Number.parseInt(slashDate[2], 10)
    if (month >= 1 && month <= 12) return month - 1
  }

  const isoDate = normalized.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (isoDate) {
    const month = Number.parseInt(isoDate[1], 10)
    if (month >= 1 && month <= 12) return month - 1
  }

  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) return parsed.getMonth()

  return null
}

function parseDate(value?: string): Date | null {
  if (!value) return null

  const normalized = value.trim()
  if (!normalized) return null

  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDate) {
    const year = Number.parseInt(isoDate[1], 10)
    const month = Number.parseInt(isoDate[2], 10)
    const day = Number.parseInt(isoDate[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day)
    }
  }

  const slashDate = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slashDate) {
    const day = Number.parseInt(slashDate[1], 10)
    const month = Number.parseInt(slashDate[2], 10)
    const currentYear = new Date().getFullYear()
    const year = slashDate[3] ? Number.parseInt(slashDate[3], 10) : currentYear
    const fullYear = year < 100 ? 2000 + year : year

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(fullYear, month - 1, day)
    }
  }

  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  return null
}

function getTaskMonthIndex(task: Task): number | null {
  return parseMonthIndex(task.createdAt) ?? parseMonthIndex(task.data)
}

function formatTaskCount(value: number): string {
  return `${value} tarefa${value === 1 ? "" : "s"}`
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === "undefined") return []

    try {
      const local = window.localStorage.getItem("tasks")
      const parsed = local ? JSON.parse(local) : []
      return Array.isArray(parsed) ? (parsed as Task[]) : []
    } catch {
      return []
    }
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>("todas")
  const view = "tarefas" as const
  const [chartsReady, setChartsReady] = useState(false)

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setTasks(list)
        localStorage.setItem("tasks", JSON.stringify(list))
      })
      .catch(() => console.log("Usando dados locais"))
  }, [])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setChartsReady(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const pendentes = tasks.filter((task) => !task.completed).length
  const concluidas = tasks.length - pendentes

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "pendentes") return !task.completed
      if (filter === "concluidas") return task.completed
      return true
    })
  }, [tasks, filter])

  const overallPercent = tasks.length ? Math.round((concluidas / tasks.length) * 100) : 0
  const xp = concluidas * 10

  const dashboard = useMemo(() => {
    const now = new Date()
    const today = toDayStart(now)
    const next7Days = new Date(today)
    next7Days.setDate(today.getDate() + 7)

    const currentMonthIndex = now.getMonth()
    const totalsByMonth = Array.from({ length: 12 }, () => 0)
    const doneByMonth = Array.from({ length: 12 }, () => 0)

    const priorityBuckets: Record<Task["priority"], PriorityPoint> = {
      alta: { prioridade: "Alta", total: 0, concluidas: 0, pendentes: 0 },
      media: { prioridade: "Media", total: 0, concluidas: 0, pendentes: 0 },
      baixa: { prioridade: "Baixa", total: 0, concluidas: 0, pendentes: 0 },
    }

    const tagMap = new Map<string, TagPoint>()

    let overdueCount = 0
    let upcomingCount = 0
    let highPriorityPending = 0

    tasks.forEach((task) => {
      const monthIndex = getTaskMonthIndex(task)
      if (monthIndex !== null) {
        totalsByMonth[monthIndex] += 1
        if (task.completed) doneByMonth[monthIndex] += 1
      }

      const priorityBucket = priorityBuckets[task.priority] ?? priorityBuckets.media
      priorityBucket.total += 1
      if (task.completed) {
        priorityBucket.concluidas += 1
      } else {
        priorityBucket.pendentes += 1
        if (task.priority === "alta") highPriorityPending += 1
      }

      const taskTag = task.tag?.trim() || "Sem tag"
      if (!tagMap.has(taskTag)) {
        tagMap.set(taskTag, { tag: taskTag, total: 0, concluidas: 0, pendentes: 0 })
      }

      const tagBucket = tagMap.get(taskTag)
      if (tagBucket) {
        tagBucket.total += 1
        if (task.completed) {
          tagBucket.concluidas += 1
        } else {
          tagBucket.pendentes += 1
        }
      }

      const dueDate = parseDate(task.data)
      if (dueDate && !task.completed) {
        if (dueDate < today) overdueCount += 1
        if (dueDate >= today && dueDate <= next7Days) upcomingCount += 1
      }
    })

    const recentMonths: MonthlyPoint[] = Array.from({ length: 6 }, (_, idx) => {
      const offset = 5 - idx
      const monthIndex = (currentMonthIndex - offset + 12) % 12
      const total = totalsByMonth[monthIndex]
      const done = doneByMonth[monthIndex]

      return {
        mes: MONTH_LABELS[monthIndex],
        total,
        concluidas: done,
        pendentes: Math.max(total - done, 0),
        taxaConclusao: total > 0 ? Math.round((done / total) * 100) : 0,
      }
    })

    const currentMonthTotal = totalsByMonth[currentMonthIndex]
    const currentMonthDone = doneByMonth[currentMonthIndex]
    const monthCompletionPercent =
      currentMonthTotal > 0 ? Math.round((currentMonthDone / currentMonthTotal) * 100) : 0

    const year = now.getFullYear()
    const daysInMonth = new Date(year, currentMonthIndex + 1, 0).getDate()
    const dayInMonth = now.getDate()
    const daysLeft = Math.max(0, daysInMonth - dayInMonth)
    const monthElapsedPercent = Math.round((dayInMonth / daysInMonth) * 100)
    const paceDelta = monthCompletionPercent - monthElapsedPercent

    const previousRate = recentMonths[recentMonths.length - 2]?.taxaConclusao ?? 0
    const latestRate = recentMonths[recentMonths.length - 1]?.taxaConclusao ?? 0
    const trendDelta = latestRate - previousRate

    const pieData: PiePoint[] =
      tasks.length === 0
        ? [{ name: "Sem tarefas", value: 1, color: "rgba(148, 163, 184, 0.65)", displayValue: 0 }]
        : [
            { name: "Concluidas", value: concluidas, color: "#22c55e" },
            { name: "Pendentes", value: pendentes, color: "#ef4444" },
          ]

    const priorityData = [priorityBuckets.alta, priorityBuckets.media, priorityBuckets.baixa]

    const tagData = Array.from(tagMap.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 6)

    return {
      recentMonths,
      pieData,
      priorityData,
      tagData,
      currentMonthTotal,
      currentMonthDone,
      monthCompletionPercent,
      monthElapsedPercent,
      daysLeft,
      tasksLeft: Math.max(0, currentMonthTotal - currentMonthDone),
      paceDelta,
      trendDelta,
      overdueCount,
      upcomingCount,
      highPriorityPending,
    }
  }, [tasks, concluidas, pendentes])

  function handleAdd(task: Task) {
    const updated = [task, ...tasks]
    setTasks(updated)
    localStorage.setItem("tasks", JSON.stringify(updated))
  }

  async function handleToggle(id: string) {
    const task = tasks.find((item) => item.id === id)
    if (!task) return

    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: !task.completed }),
    })

    if (!response.ok) return

    setTasks((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
      localStorage.setItem("tasks", JSON.stringify(updated))
      return updated
    })
  }

  async function handleDelete(id: string) {
    const response = await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) return

    setTasks((prev) => {
      const updated = prev.filter((item) => item.id !== id)
      localStorage.setItem("tasks", JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Tarefas</h1>

            {view === "tarefas" && (
              <p className={styles.pageSubtitle}>
                <span className={styles.pendente}>{pendentes} pendentes</span>
                <span className={styles.separator}>.</span>
                <span className={styles.concluida}>{concluidas} concluidas</span>
              </p>
            )}
          </div>

          {view === "tarefas" && (
            <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
              <span className={styles.addIcon}>+</span>
              Nova tarefa
            </button>
          )}
        </header>

        {view === "tarefas" && (
          <div className={styles.contentGrid}>
            <section className={styles.tasksColumn}>
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

              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Progresso geral</span>
                <span className={styles.progressValue}>{overallPercent}%</span>
              </div>

              <div className={styles.progressWrap}>
                <div className={styles.progressBar} style={{ width: `${overallPercent}%` }} />
              </div>

              <p className={styles.progressHint}>
                {pendentes > 0
                  ? `${formatTaskCount(pendentes)} para fechar o ciclo.`
                  : "Tudo concluido por enquanto."}
              </p>

              <div className={styles.taskList}>
                {filtered.length === 0 ? (
                  <div className={styles.empty}>
                    <p>Nenhuma tarefa aqui ainda.</p>
                  </div>
                ) : (
                  filtered.map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
                  ))
                )}
              </div>
            </section>

            <aside className={styles.statsColumn}>
              <section className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div>
                    <h3 className={styles.statTitle}>Resumo tecnico</h3>
                    <p className={styles.statSubtitle}>KPI, risco e ritmo do mes</p>
                  </div>
                  <span className={styles.statKpi}>{dashboard.monthCompletionPercent}% no mes</span>
                </div>

                <p className={styles.xpValue}>{xp} XP</p>

                <div className={styles.monthTimerMeta}>
                  <span>Mes em andamento: {dashboard.monthElapsedPercent}%</span>
                  <span>{dashboard.daysLeft} dias restantes</span>
                </div>

                <div className={styles.monthTimerWrap}>
                  <div
                    className={styles.monthTimerFill}
                    style={{ width: `${dashboard.monthElapsedPercent}%` }}
                  />
                </div>

                <div
                  className={`${styles.paceBadge} ${
                    dashboard.paceDelta > 0
                      ? styles.pacePositive
                      : dashboard.paceDelta < 0
                        ? styles.paceNegative
                        : styles.paceNeutral
                  }`}
                >
                  {dashboard.paceDelta > 0
                    ? `+${dashboard.paceDelta}% acima do ritmo esperado`
                    : dashboard.paceDelta < 0
                      ? `${dashboard.paceDelta}% abaixo do ritmo esperado`
                      : "Ritmo alinhado com o calendario"}
                </div>

                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCell}>
                    <p className={styles.kpiLabel}>Taxa global</p>
                    <p className={styles.kpiValue}>{overallPercent}%</p>
                  </div>
                  <div className={styles.kpiCell}>
                    <p className={styles.kpiLabel}>Pendentes alta</p>
                    <p className={styles.kpiValue}>{dashboard.highPriorityPending}</p>
                  </div>
                  <div className={styles.kpiCell}>
                    <p className={styles.kpiLabel}>Atrasadas</p>
                    <p className={styles.kpiValue}>{dashboard.overdueCount}</p>
                  </div>
                  <div className={styles.kpiCell}>
                    <p className={styles.kpiLabel}>Vencem em 7d</p>
                    <p className={styles.kpiValue}>{dashboard.upcomingCount}</p>
                  </div>
                </div>
              </section>

              <section className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div>
                    <h3 className={styles.statTitle}>Throughput mensal</h3>
                    <p className={styles.statSubtitle}>Stack concluido/pendente + linha de taxa</p>
                  </div>
                  <span className={styles.statKpi}>
                    {dashboard.trendDelta >= 0 ? `+${dashboard.trendDelta}` : dashboard.trendDelta}% trend
                  </span>
                </div>

                <div className={styles.chartTallWrap}>
                  {chartsReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={dashboard.recentMonths}
                        margin={{ top: 8, right: 8, left: -14, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis
                          dataKey="mes"
                          tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="count"
                          allowDecimals={false}
                          tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={24}
                        />
                        <YAxis
                          yAxisId="rate"
                          orientation="right"
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                          tick={{ fill: "rgba(125,211,252,0.85)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={32}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(99,102,241,0.12)" }}
                          contentStyle={{
                            background: "rgba(17, 24, 39, 0.95)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px",
                            color: "#f8fafc",
                          }}
                          formatter={(value, name) => {
                            const numericValue = typeof value === "number" ? value : Number(value) || 0
                            if (name === "Taxa") return [`${numericValue}%`, "Taxa"]
                            return [formatTaskCount(numericValue), String(name)]
                          }}
                        />
                        <Bar
                          yAxisId="count"
                          name="Concluidas"
                          dataKey="concluidas"
                          stackId="a"
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          yAxisId="count"
                          name="Pendentes"
                          dataKey="pendentes"
                          stackId="a"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="rate"
                          name="Taxa"
                          type="monotone"
                          dataKey="taxaConclusao"
                          stroke="#7dd3fc"
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0, fill: "#7dd3fc" }}
                          activeDot={{ r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={styles.chartPlaceholder}>Carregando grafico...</div>
                  )}
                </div>
              </section>

              <section className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div>
                    <h3 className={styles.statTitle}>Backlog por prioridade</h3>
                    <p className={styles.statSubtitle}>Distribuicao por criticidade</p>
                  </div>
                </div>

                <div className={styles.chartWrap}>
                  {chartsReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboard.priorityData}
                        layout="vertical"
                        margin={{ top: 8, right: 10, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="prioridade"
                          tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          width={52}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(99,102,241,0.12)" }}
                          contentStyle={{
                            background: "rgba(17, 24, 39, 0.95)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px",
                            color: "#f8fafc",
                          }}
                          formatter={(value, name) => {
                            const numericValue = typeof value === "number" ? value : Number(value) || 0
                            return [formatTaskCount(numericValue), String(name)]
                          }}
                        />
                        <Bar name="Concluidas" dataKey="concluidas" stackId="a" fill="#10b981" radius={[0, 6, 6, 0]} />
                        <Bar name="Pendentes" dataKey="pendentes" stackId="a" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={styles.chartPlaceholder}>Carregando grafico...</div>
                  )}
                </div>
              </section>

              <section className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div>
                    <h3 className={styles.statTitle}>Concluido vs pendente</h3>
                    <p className={styles.statSubtitle}>Distribuicao atual das tarefas</p>
                  </div>
                </div>

                <div className={styles.pieLayout}>
                  <div className={styles.pieWrap}>
                    {chartsReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboard.pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={2}
                            stroke="transparent"
                          >
                            {dashboard.pieData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "rgba(17, 24, 39, 0.95)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "10px",
                              color: "#f8fafc",
                            }}
                            formatter={(value, name) => {
                              const numericValue = typeof value === "number" ? value : Number(value) || 0
                              return [formatTaskCount(numericValue), name]
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={styles.piePlaceholder} />
                    )}

                    <div className={styles.pieCenter}>
                      <strong>{tasks.length}</strong>
                      <span>tarefas</span>
                    </div>
                  </div>

                  <div className={styles.legendList}>
                    {dashboard.pieData.map((item) => (
                      <div key={item.name} className={styles.legendItem}>
                        <div className={styles.legendLabel}>
                          <span className={styles.legendDot} style={{ background: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className={styles.legendValue}>{item.displayValue ?? item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div>
                    <h3 className={styles.statTitle}>Categorias dominantes</h3>
                    <p className={styles.statSubtitle}>Top 6 por volume</p>
                  </div>
                </div>

                <div className={styles.chartWrap}>
                  {chartsReady ? (
                    dashboard.tagData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dashboard.tagData}
                          layout="vertical"
                          margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="tag"
                            width={84}
                            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value: string) =>
                              value.length > 12 ? `${value.slice(0, 12)}...` : value
                            }
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(139,92,246,0.12)" }}
                            contentStyle={{
                              background: "rgba(17, 24, 39, 0.95)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "10px",
                              color: "#f8fafc",
                            }}
                            formatter={(value) => {
                              const numericValue = typeof value === "number" ? value : Number(value) || 0
                              return [formatTaskCount(numericValue), "Total"]
                            }}
                          />
                          <Bar dataKey="total" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={styles.chartPlaceholder}>Sem categorias para analisar.</div>
                    )
                  ) : (
                    <div className={styles.chartPlaceholder}>Carregando grafico...</div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}

      </main>

      {modalOpen && <TaskModal onClose={() => setModalOpen(false)} onAdd={handleAdd} />}
    </div>
  )
}
