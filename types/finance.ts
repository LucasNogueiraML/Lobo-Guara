export type TransactionType = "receita" | "despesa"

export type Transaction = {
  id: string
  title: string
  amount: number
  type: TransactionType
  category: string
  date: string
}

export type FilterType = "todas" | "receitas" | "despesas"

export const CATEGORIES_RECEITA = ["Salário", "Freelance", "Investimentos", "Outros"]
export const CATEGORIES_DESPESA = ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Outros"]

export const TYPE_CONFIG: Record<TransactionType, { label: string; color: string; bg: string; sign: string }> = {
  receita: { label: "Receita", color: "#34d399", bg: "rgba(52,211,153,0.15)", sign: "+" },
  despesa: { label: "Despesa", color: "#f87171", bg: "rgba(248,113,113,0.15)", sign: "-" },
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}