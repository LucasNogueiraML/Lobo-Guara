import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../lib/authOptions"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json([], { status: 401 })

  try {
    const result = await pool.query(
      `SELECT * FROM rotina WHERE user_id = $1 ORDER BY title ASC`,
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
  if (!session?.user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id, title } = await req.json()

  try {
    await pool.query(
      `INSERT INTO rotina (id, title, streak, ultimo_concluido, user_id)
       VALUES ($1, $2, 0, NULL, $3)`,
      [id, title, session.user.email]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id, streak, ultimo_concluido } = await req.json()

  try {
    await pool.query(
      `UPDATE rotina SET streak = $1, ultimo_concluido = $2 WHERE id = $3 AND user_id = $4`,
      [streak, ultimo_concluido, id, session.user.email]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await req.json()

  try {
    await pool.query(`DELETE FROM rotina WHERE id = $1 AND user_id = $2`, [id, session.user.email])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}