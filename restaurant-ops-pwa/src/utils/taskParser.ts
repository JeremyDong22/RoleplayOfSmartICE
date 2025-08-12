// Import TaskTemplate from workflowParser
import type { TaskTemplate } from '../types/task.types'
export type { TaskTemplate } from '../types/task.types'

export interface Task extends TaskTemplate {
  scheduledDate: Date
  scheduledStartTime: Date
  scheduledEndTime: Date
  status: 'upcoming' | 'active' | 'completed' | 'overdue'
}

// Import workflow data - DEPRECATED: Now using database
// import { workflowPeriods } from '../types/task.types'

// Get all task templates from workflow periods - DEPRECATED: Now using database
// export const taskTemplates: TaskTemplate[] = workflowPeriods.flatMap(period => [
//   ...period.tasks.manager,
//   ...period.tasks.chef
// ])
export const taskTemplates: TaskTemplate[] = [] // Now loaded from database

// Generate tasks for today based on current time
export function generateTodayTasks(role: 'Manager' | 'Chef', testTime?: Date): Task[] {
  const today = testTime || new Date()
  const tasks: Task[] = []

  // Filter templates by role
  const roleTemplates = taskTemplates.filter(template => template.role === role)

  roleTemplates.forEach(template => {
    const [startHour, startMinute] = template.startTime.split(':').map(Number)
    const [endHour, endMinute] = template.endTime.split(':').map(Number)

    const scheduledStartTime = new Date(today)
    scheduledStartTime.setHours(startHour, startMinute, 0, 0)

    const scheduledEndTime = new Date(today)
    scheduledEndTime.setHours(endHour, endMinute, 0, 0)

    const now = testTime || new Date()
    let status: Task['status'] = 'upcoming'

    if (now > scheduledEndTime) {
      status = 'completed' // For demo, mark past tasks as completed
    } else if (now >= scheduledStartTime && now <= scheduledEndTime) {
      status = 'active'
    }

    tasks.push({
      ...template,
      scheduledDate: today,
      scheduledStartTime,
      scheduledEndTime,
      status,
    })
  })

  return tasks.sort((a, b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime())
}

// Get the current active task
export function getCurrentTask(tasks: Task[], testTime?: Date): Task | null {
  const now = testTime || new Date()
  return tasks.find(task => 
    task.status === 'active' || 
    (task.status === 'upcoming' && task.scheduledStartTime.getTime() > now.getTime())
  ) || null
}

// Calculate time remaining for a task
export function getTimeRemaining(task: Task, testTime?: Date): {
  total: number
  hours: number
  minutes: number
  seconds: number
  isOverdue: boolean
} {
  const now = testTime || new Date()
  const endTime = task.scheduledEndTime
  const total = endTime.getTime() - now.getTime()
  
  const seconds = Math.floor((total / 1000) % 60)
  const minutes = Math.floor((total / 1000 / 60) % 60)
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  
  return {
    total,
    hours: Math.max(0, hours),
    minutes: Math.max(0, minutes),
    seconds: Math.max(0, seconds),
    isOverdue: total < 0
  }
}