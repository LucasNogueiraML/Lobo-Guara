import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../lib/authOptions"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json(null, { status: 401 })

  try {
    const result = await pool.query(
      `SELECT * FROM usuarios WHERE email = $1`,
      [session.user.email]
    )
    // Se não existe ainda, cria o usuário
    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO usuarios (email, nome, foto, tema) VALUES ($1, $2, $3, 'escuro')`,
        [session.user.email, session.user.name, session.user.image]
      )
      return NextResponse.json({ email: session.user.email, tema: "escuro" })
    }
    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error(err)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { tema } = await req.json()

  try {
    await pool.query(
      `UPDATE usuarios SET tema = $1 WHERE email = $2`,
      [tema, session.user.email]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}