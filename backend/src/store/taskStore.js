const taskStore = []

export function saveTask(task) {
  taskStore.push(task)
  console.log("[TaskStore] Task saved:", task.taskId)
}

export function getAllTasks() {
  return taskStore
}

export function getTaskById(taskId) {
  return taskStore.find((t) => t.taskId === taskId)
}

