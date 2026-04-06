export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #111827, #0f172a)",
        color: "#e2e8f0",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.3)",
          background: "rgba(15, 23, 42, 0.8)",
          padding: 22,
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Você está offline</h1>
        <p style={{ marginTop: 8, color: "#cbd5e1", fontSize: 14 }}>
          Sem conexão com a internet agora. Assim que voltar, recarregue para sincronizar.
        </p>
      </section>
    </main>
  )
}

