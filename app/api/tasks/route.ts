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
      `SELECT * FROM tarefas WHERE user_id = $1 ORDER BY "createdAt" DESC`,
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
  const { id, title, desc, priority, tag, completed, createdAt } = body

  try {
    await pool.query(
      `INSERT INTO tarefas (id, title, "desc", priority, tag, completed, "createdAt", user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, title, desc, priority, tag, completed, createdAt, session.user.email]
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
    await pool.query(`DELETE FROM tarefas WHERE id = $1 AND user_id = $2`, [id, session.user.email])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id, completed } = await req.json()
  try {
    await pool.query(
      `UPDATE tarefas SET completed = $1 WHERE id = $2 AND user_id = $3`,
      [completed, id, session.user.email]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}