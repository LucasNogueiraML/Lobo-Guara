"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import styles from "./MenuInicial.module.css"
import Image from "next/image"

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const {data: session } = useSession()
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [tema, setTema] = useState<"escuro" | "claro">("escuro")

  // Carrega tema do banco ao iniciar
  useEffect(() => {
    if (!session?.user?.email) return
    fetch("/api/usuarios")
      .then((res) => res.json())
      .then((data) => {
        if (data?.tema) {
          setTema(data.tema)
          document.documentElement.setAttribute("data-tema", data.tema)
        }
      })
      .catch(() => {})
  }, [session])

  async function handleToggleTema() {
    const novoTema = tema === "escuro" ? "claro" : "escuro"
    setTema(novoTema)
    document.documentElement.setAttribute("data-tema", novoTema)
    await fetch("/api/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tema: novoTema }),
    })
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sideBar}>
        <button className={styles.iconButton} onClick={() => router.push("/")} title="Dashboard">
          <img src="/dashboard.svg" alt="Dashboard" />
        </button>
        <button className={styles.iconButton} onClick={() => router.push("/tarefas")} title="Tarefas">
          <img src="/task.svg" alt="Tarefas" />
        </button>
        <button className={styles.iconButton} onClick={() => router.push("/financeiro")} title="Financeiro">
          <img src="/money.svg" alt="Financeiro" />
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Botão de perfil — foto do Google ou ícone padrão */}
       <button
  className={styles.iconButton}
  onClick={() => setPerfilOpen(true)}
  title="Perfil"
  style={{ marginBottom: 12 }}
>
  {session?.user?.image ? (
    <Image
      src={session.user.image}
      alt="Perfil"
      width={32}
      height={32}
      style={{ borderRadius: "50%" }}
    />
  ) : (
    <img src="/user.svg" alt="Perfil" />
  )}
</button>
      </aside>

      <main className={styles.main}>{children}</main>

      {/* Modal de perfil */}
      {perfilOpen && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setPerfilOpen(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 400,
              background: "rgba(15,20,35,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: 32,
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
              animation: "modalIn 0.2s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Foto + nome */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              {session?.user?.image && (
                 <Image
    src={session.user.image}
    alt="Foto"
    width={56}
    height={56}
    style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)" }}
  />
              )}
              <div>
                <p style={{ color: "white", fontWeight: 700, fontSize: 18, margin: 0 }}>
                  {session?.user?.name ?? "Usuário"}
                </p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "4px 0 0" }}>
                  {session?.user?.email}
                </p>
              </div>
            </div>

            {/* Toggle de tema */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              marginBottom: 12,
            }}>
              <div>
                <p style={{ color: "white", fontSize: 14, fontWeight: 500, margin: 0 }}>
                  {tema === "escuro" ? "🌙 Tema escuro" : "☀️ Tema claro"}
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "2px 0 0" }}>
                  Clique para alternar
                </p>
              </div>
              <div
                onClick={handleToggleTema}
                style={{
                  width: 44, height: 24, borderRadius: 99,
                  background: tema === "claro" ? "#6366f1" : "rgba(255,255,255,0.15)",
                  cursor: "pointer", position: "relative", transition: "background 0.3s",
                }}
              >
                <div style={{
                  position: "absolute", top: 3,
                  left: tema === "claro" ? 23 : 3,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "white", transition: "left 0.3s",
                }} />
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                width: "100%", padding: "12px 0",
                borderRadius: 11,
                border: "1px solid rgba(248,113,113,0.3)",
                background: "rgba(248,113,113,0.08)",
                color: "#f87171",
                fontWeight: 600, fontSize: 14,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              Sair da conta
            </button>

          </div>
        </div>
      )}
    </div>
  )
}
