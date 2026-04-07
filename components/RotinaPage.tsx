"use client"

import RotinaView from "@/components/RotinaView"
import styles from "./TaskPage.module.css"

export default function RotinaPage() {
  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Rotinas</h1>
            <p className={styles.pageSubtitle}>
              <span className={styles.concluida}>Acompanhamento de streak e consistencia mensal</span>
            </p>
          </div>
        </header>

        <RotinaView />
      </main>
    </div>
  )
}
