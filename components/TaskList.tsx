import { Task } from "@/types/task"

type Props = {
  tasks: Task[]
  onToggle: (id: string) => void
}

export default function TaskList({ tasks, onToggle }: Props) {
  return (
    <ul className="mt-4 space-y-2"> 
      {tasks.map((task) => (
        <li
          key={task.id}
          onClick={() => onToggle(task.id)}
          className={`px-3 py-2 rounded-lg cursor-pointer ${
            task.completed
              ? "bg-green-200 line-through"
              : "bg-gray-200"
          }`}
        >
          <strong>{task.title}</strong><br /> {task.desc}
        </li>
      ))}
    </ul>
  )
}