import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT * FROM financeiro ORDER BY "createdAt" DESC`
    )
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error(err)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { id, title, amount, type, category, createdAt } = body

  try {
    await pool.query(
      `INSERT INTO financeiro (id, title, amount, type, category, "createdAt", user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, title, amount, type, category, createdAt, session.user.email]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: "Erro ao salvar" }, { status: 500 })
  }
} 
export async function DELETE(req: Request) {
  const { id } = await req.json()
  try {
    await pool.query(`DELETE FROM financeiro WHERE id = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const { id, completed } = await req.json()
  try {
    await pool.query(
      `UPDATE financeiro SET completed = $1 WHERE id = $2`,
      [completed, id]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}