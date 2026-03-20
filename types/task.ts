export type Priority = "baixa" | "media" | "alta"

export type Task = {
  id: string
  title: string
  desc: string
  completed: boolean
  priority: Priority
  tag: string
  createdAt: string
  data?: string
}

export type FilterType = "todas" | "pendentes" | "concluidas"

export const PRIORITIES: Priority[] = ["baixa", "media", "alta"]

export const TAGS = ["Pessoal", "Trabalho", "Financeiro", "Estudos", "Saúde"]

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  alta:  { label: "Alta",  color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  media: { label: "Média", color: "#fbbf24", bg: "rgba(251,191,36,0.15)"  },
  baixa: { label: "Baixa", color: "#34d399", bg: "rgba(52,211,153,0.15)"  },
}