import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  const body = await req.json();
  const { id, title, desc, priority, tag, completed, createdAt } = body;

  try {
    await pool.query(
  `INSERT INTO tarefas (id, title, "desc", priority, tag, completed, "createdAt")
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [id, title, desc, priority, tag, completed, createdAt]
);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Erro ao salvar" }, { status: 500 });
  }
}
