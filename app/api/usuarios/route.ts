import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Pool } from "pg"

import { authOptions } from "../lib/authOptions"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

type UsuarioPayload = {
  tema?: "escuro" | "claro"
  privacidade?: boolean
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json(null, { status: 401 })

  try {
    const result = await pool.query(`SELECT * FROM usuarios WHERE email = $1`, [session.user.email])

    if (result.rows.length === 0) {
      try {
        await pool.query(
          `INSERT INTO usuarios (email, nome, foto, tema, privacidade)
           VALUES ($1, $2, $3, 'escuro', false)`,
          [session.user.email, session.user.name, session.user.image],
        )
      } catch {
        await pool.query(
          `INSERT INTO usuarios (email, nome, foto, tema) VALUES ($1, $2, $3, 'escuro')`,
          [session.user.email, session.user.name, session.user.image],
        )
      }

      return NextResponse.json({ email: session.user.email, tema: "escuro", privacidade: false })
    }

    const user = result.rows[0]
    const hasPrivacidadeColumn = Object.prototype.hasOwnProperty.call(user, "privacidade")

    return NextResponse.json({
      ...user,
      ...(hasPrivacidadeColumn ? { privacidade: Boolean(user?.privacidade) } : {}),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const body = (await req.json()) as UsuarioPayload
  const hasTema = body.tema === "escuro" || body.tema === "claro"
  const hasPrivacidade = typeof body.privacidade === "boolean"

  if (!hasTema && !hasPrivacidade) {
    return NextResponse.json({ error: "Nenhuma preferencia enviada" }, { status: 400 })
  }

  try {
    if (hasTema && hasPrivacidade) {
      try {
        await pool.query(
          `UPDATE usuarios
           SET tema = $1, privacidade = $2
           WHERE email = $3`,
          [body.tema, body.privacidade, session.user.email],
        )
      } catch {
        await pool.query(`UPDATE usuarios SET tema = $1 WHERE email = $2`, [body.tema, session.user.email])
      }
    } else if (hasTema) {
      await pool.query(`UPDATE usuarios SET tema = $1 WHERE email = $2`, [body.tema, session.user.email])
    } else if (hasPrivacidade) {
      try {
        await pool.query(`UPDATE usuarios SET privacidade = $1 WHERE email = $2`, [body.privacidade, session.user.email])
      } catch {
        // Column may not exist yet. Keep request successful for local fallback.
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
