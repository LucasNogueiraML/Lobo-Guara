"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

import { PRIVACY_STORAGE_KEY, readPrivacyMode, writePrivacyMode } from "@/lib/privacyMode"
import styles from "./Layout.module.css"

type UserPrefsPayload = {
  tema?: "escuro" | "claro"
  privacidade?: boolean
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [tema, setTema] = useState<"escuro" | "claro">("escuro")
  const [privacidade, setPrivacidade] = useState(false)
  const hideSidebar = pathname === "/"

  useEffect(() => {
    if (!session?.user?.email) return

    fetch("/api/usuarios")
      .then((res) => res.json())
      .then((data) => {
        if (data?.tema === "escuro" || data?.tema === "claro") {
          setTema(data.tema)
          document.documentElement.setAttribute("data-tema", data.tema)
        }

        const localRaw = window.localStorage.getItem(PRIVACY_STORAGE_KEY)
        const localDefined = localRaw === "1" || localRaw === "0"
        const serverValue = typeof data?.privacidade === "boolean" ? data.privacidade : false
        const privacyEnabled = localDefined ? readPrivacyMode() : serverValue
        setPrivacidade(privacyEnabled)
        writePrivacyMode(privacyEnabled)
      })
      .catch(() => {
        const localPrivacy = readPrivacyMode()
        setPrivacidade(localPrivacy)
        writePrivacyMode(localPrivacy)
      })
  }, [session])

  async function savePreferences(payload: UserPrefsPayload) {
    try {
      await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } catch {
      // Keep UI responsive even when API is unavailable.
    }
  }

  async function handleToggleTema() {
    const novoTema = tema === "escuro" ? "claro" : "escuro"
    setTema(novoTema)
    document.documentElement.setAttribute("data-tema", novoTema)

    await savePreferences({ tema: novoTema, privacidade })
  }

  async function handleTogglePrivacidade() {
    const next = !privacidade
    setPrivacidade(next)
    writePrivacyMode(next)

    await savePreferences({ tema, privacidade: next })
  }

  return (
    <div className={styles.container}>
      {!hideSidebar && (
        <aside className={styles.sideBar}>
          <button className={styles.iconButton} onClick={() => router.push("/dashboard")} title="Dashboard">
            <Image src="/dashboard.svg" alt="Dashboard" width={20} height={20} className={styles.iconImg} />
          </button>

          <button className={styles.iconButton} onClick={() => router.push("/tarefas")} title="Tarefas">
            <Image src="/task.svg" alt="Tarefas" width={20} height={20} className={styles.iconImg} />
          </button>

          <button className={styles.iconButton} onClick={() => router.push("/rotina")} title="Rotinas">
            <span className={styles.iconEmoji}>🔁</span>
          </button>

          <button className={styles.iconButton} onClick={() => router.push("/organizador")} title="Organizador do dia">
            <span className={styles.iconEmoji}>🧩</span>
          </button>

          <button className={styles.iconButton} onClick={() => router.push("/financeiro")} title="Financeiro">
            <Image src="/money.svg" alt="Financeiro" width={20} height={20} className={styles.iconImg} />
          </button>

          <button className={styles.iconButton} onClick={() => router.push("/simulacao")} title="Simulacao">
            <span className={styles.iconEmoji}>⏰</span>
          </button>

          <div style={{ flex: 1 }} />

          <button
            className={styles.iconButton}
            onClick={() => setPerfilOpen(true)}
            title="Perfil"
            style={{ marginBottom: 12 }}
          >
            {session?.user?.image ? (
              <Image src={session.user.image} alt="Perfil" width={32} height={32} style={{ borderRadius: "50%" }} />
            ) : (
              <Image src="/user.svg" alt="Perfil" width={20} height={20} className={styles.iconImg} />
            )}
          </button>
        </aside>
      )}

      <main className={styles.main}>{children}</main>

      {perfilOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setPerfilOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: "rgba(15,20,35,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: 32,
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
              animation: "modalIn 0.2s ease",
            }}
            onClick={(event) => event.stopPropagation()}
          >
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
                  {session?.user?.name ?? "Usuario"}
                </p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "4px 0 0" }}>
                  {session?.user?.email}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                marginBottom: 12,
              }}
            >
              <div>
                <p style={{ color: "white", fontSize: 14, fontWeight: 500, margin: 0 }}>
                  {tema === "escuro" ? "Tema escuro" : "Tema claro"}
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "2px 0 0" }}>
                  Clique para alternar
                </p>
              </div>
              <div
                onClick={handleToggleTema}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 99,
                  background: tema === "claro" ? "#6366f1" : "rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.3s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: tema === "claro" ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.3s",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                marginBottom: 16,
              }}
            >
              <div>
                <p style={{ color: "white", fontSize: 14, fontWeight: 500, margin: 0 }}>
                  Modo privacidade
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "2px 0 0" }}>
                  Esconde valores financeiros com asteriscos
                </p>
              </div>
              <div
                onClick={handleTogglePrivacidade}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 99,
                  background: privacidade ? "#10b981" : "rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.3s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: privacidade ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.3s",
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 11,
                border: "1px solid rgba(248,113,113,0.3)",
                background: "rgba(248,113,113,0.08)",
                color: "#f87171",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
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
