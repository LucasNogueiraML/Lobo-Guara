"use client"

import { useState } from "react"

type Props = {
  onAdd: (title: string, desc: string) => void
}

export default function TaskInput({ onAdd }: Props) {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")

  function handleSubmit() {
    if (!title.trim()) return
    onAdd(title, desc)
    setTitle("")
    setDesc("")
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Digite uma tarefa..."
        className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Digite a descrição da tarefa..."
        className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
      >
        Add
      </button>
    </div>
  )
}
