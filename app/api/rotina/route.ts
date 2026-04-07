import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Pool } from "pg"

import { authOptions } from "../lib/authOptions"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

function sanitizeHistorico(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const unique = new Set<string>()

  value.forEach((item) => {
    if (typeof item !== "string") return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item)) return
    unique.add(item)
  })

  return Array.from(unique).sort()
}

async function listRotinas(email: string) {
  try {
    const result = await pool.query(
      `SELECT id, title, streak, ultimo_concluido, user_id, historico
       FROM rotina
       WHERE user_id = $1
       ORDER BY title ASC`,
      [email],
    )

    return result.rows.map((row) => ({
      ...row,
      historico: sanitizeHistorico(row.historico),
    }))
  } catch {
    const fallback = await pool.query(
      `SELECT id, title, streak, ultimo_concluido, user_id
       FROM rotina
       WHERE user_id = $1
       ORDER BY title ASC`,
      [email],
    )

    return fallback.rows.map((row) => ({
      ...row,
      historico: [],
    }))
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json([], { status: 401 })

  try {
    const rows = await listRotinas(session.user.email)
    return NextResponse.json(rows)
  } catch (err) {
    console.error(err)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const { id, title, historico } = await req.json()
  const safeHistorico = sanitizeHistorico(historico)

  try {
    try {
      await pool.query(
        `INSERT INTO rotina (id, title, streak, ultimo_concluido, user_id, historico)
         VALUES ($1, $2, 0, NULL, $3, $4::jsonb)`,
        [id, title, session.user.email, JSON.stringify(safeHistorico)],
      )
    } catch {
      await pool.query(
        `INSERT INTO rotina (id, title, streak, ultimo_concluido, user_id)
         VALUES ($1, $2, 0, NULL, $3)`,
        [id, title, session.user.email],
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const { id, streak, ultimo_concluido, historico } = await req.json()
  const safeHistorico = sanitizeHistorico(historico)

  try {
    try {
      await pool.query(
        `UPDATE rotina
         SET streak = $1,
             ultimo_concluido = $2,
             historico = $3::jsonb
         WHERE id = $4 AND user_id = $5`,
        [streak, ultimo_concluido, JSON.stringify(safeHistorico), id, session.user.email],
      )
    } catch {
      await pool.query(
        `UPDATE rotina
         SET streak = $1,
             ultimo_concluido = $2
         WHERE id = $3 AND user_id = $4`,
        [streak, ultimo_concluido, id, session.user.email],
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const { id } = await req.json()

  try {
    await pool.query(`DELETE FROM rotina WHERE id = $1 AND user_id = $2`, [id, session.user.email])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
