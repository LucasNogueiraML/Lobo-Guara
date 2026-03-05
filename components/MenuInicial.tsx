"use client"

import styles from "./MenuInicial.module.css"
import { useRouter } from "next/navigation"

type Props = {
  nome: string
  tarefasPendentes: number
}

export default function MenuInicial({ nome, tarefasPendentes }: Props) {
  const router = useRouter()

  return (
  <div className={styles.container}>
    
   

    {/* ÁREA DIREITA INTEIRA */}
    <div className={styles.main}>
      
      {/* TOPBAR */}
      <header className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Olá, {nome}</h1>
         <button onClick={() => router.push("/tarefas")} 
         className={styles.buttonPendente}> 
         <p className={styles.subtitle}> Você tem {tarefasPendentes} tarefas pendentes </p> 
         </button>
          
        </div>
      </header>

      {/* DASHBOARD */}
      <main className={styles.dashboard}>
        <div className={styles.cardA}>Financeiro</div>
        <div className={styles.cardB}>Tarefas Hoje</div>
        <div className={styles.cardC}>Estatísticas</div>
        <div className={styles.cardD}>Projeções</div>
        <div className={styles.cardE}>Planejamento</div>
        <div className={styles.cardF}>Curiosidades</div>
        <div className={styles.cardG}>Horas Totais</div>
        <div className={styles.cardH}>Metas</div>
        <div className={styles.cardI}>Resumo Geral</div>
      </main>

    </div>
    
  </div>
)}