"use client"

import { useState } from "react"
import TaskInput from "@/components/TaskInput"
import TaskList from "@/components/TaskList"
import { Task } from "@/.next/types/task"
import { v4 as uuidv4 } from "uuid"
import MenuInicial from "@/components/MenuInicial"

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])

  function handleAdd(title: string, desc: string) {
    const newTask: Task = {
      id: uuidv4(),
      title,
      desc,
      completed: false,
    }

    setTasks([...tasks, newTask])
    return (
    <MenuInicial nome="Lucas" tarefasPendentes={3} />
  )
  }

  function handleToggle(id: string) {
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Task App Estruturado
        </h1>

        <TaskInput onAdd={handleAdd} />
        <TaskList tasks={tasks} onToggle={handleToggle} />
      </div>
    </main>
  )
}