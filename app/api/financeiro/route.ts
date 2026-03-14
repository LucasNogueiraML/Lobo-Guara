import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../lib/authOptions"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json([], { status: 401 })
  }

  try {
    const result = await pool.query(
      `SELECT * FROM financeiro WHERE user_id = $1 ORDER BY "createdAt" DESC`,
      [session.user.email]
    )
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error(err)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { id, title, amount, type, category, date, data, recorrencia } = body

  try {
    await pool.query(
      `INSERT INTO financeiro (id, title, amount, type, category, date, data, recorrencia, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, title, amount, type, category, date, data, recorrencia, session.user.email]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: "Erro ao salvar" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await req.json()
  try {
    await pool.query(`DELETE FROM financeiro WHERE id = $1 AND user_id = $2`, [id, session.user.email])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}