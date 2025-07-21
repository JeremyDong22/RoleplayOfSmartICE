// Parse workflow from markdown and generate task templates
export interface TaskTemplate {
  id: string
  title: string
  description: string
  timeSlot: string
  startTime: string
  endTime: string
  role: 'Manager' | 'Chef'
  department: '前厅' | '后厨'
  requiresPhoto: boolean
  requiresVideo: boolean
  requiresText: boolean
}

export interface Task extends TaskTemplate {
  scheduledDate: Date
  scheduledStartTime: Date
  scheduledEndTime: Date
  status: 'upcoming' | 'active' | 'completed' | 'overdue'
}

// Task templates parsed from the workflow document
export const taskTemplates: TaskTemplate[] = [
  // 开店 Opening (10:00-10:30)
  {
    id: 'opening-1',
    title: '更换工作服、佩戴工牌',
    description: '检查门店设备运转情况并查看能源余额情况（水电气）',
    timeSlot: 'opening',
    startTime: '10:00',
    endTime: '10:10',
    role: 'Manager',
    department: '前厅',
    requiresPhoto: true,
    requiresVideo: false,
    requiresText: true,
  },
  {
    id: 'opening-2',
    title: '召集门店伙伴开展早会',
    description: '清点到岗人数，总结问题，安排分工',
    timeSlot: 'opening',
    startTime: '10:10',
    endTime: '10:20',
    role: 'Manager',
    department: '前厅',
    requiresPhoto: false,
    requiresVideo: false,
    requiresText: true,
  },
  {
    id: 'opening-3',
    title: '召集门店伙伴开展早会',
    description: '清点到岗人数，总结问题，安排分工',
    timeSlot: 'opening',
    startTime: '10:10',
    endTime: '10:20',
    role: 'Chef',
    department: '后厨',
    requiresPhoto: false,
    requiresVideo: false,
    requiresText: true,
  },

  // 餐前准备（午市）Lunch Prep (10:35-11:25)
  // 前厅 Front of House
  {
    id: 'lunch-prep-1',
    title: '卫生准备',
    description: '吧台、营业区域、卫生间，清洁间的地面、台面、椅面、垃圾篓清洁',
    timeSlot: 'lunch-prep',
    startTime: '10:35',
    endTime: '11:00',
    role: 'Manager',
    department: '前厅',
    requiresPhoto: true,
    requiresVideo: false,
    requiresText: true,
  },
  {
    id: 'lunch-prep-2',
    title: '食品安全检查',
    description: '原材料效期检查，原材料及半成品保存情况检查',
    timeSlot: 'lunch-prep',
    startTime: '10:35',
    endTime: '10:45',
    role: 'Manager',
    department: '前厅',
    requiresPhoto: true,
    requiresVideo: false,
    requiresText: true,
  },
  {
    id: 'lunch-prep-3',
    title: '物资准备',
    description: '桌面摆台、客用茶水、翻台用餐具、纸巾、餐前水果小吃',
    timeSlot: 'lunch-prep',
    startTime: '10:35',
    endTime: '11:15',
    role: 'Manager',
    department: '前厅',
    requiresPhoto: true,
    requiresVideo: false,
    requiresText: false,
  },
  {
    id: 'lunch-prep-4',
    title: '开市巡店验收',
    description: '根据检查清单逐一检查确保开市工作准备完毕',
    timeSlot: 'lunch-prep',
    startTime: '11:15',
    endTime: '11:25',
    role: 'Manager',
    department: '前厅',
    requiresPhoto: false,
    requiresVideo: false,
    requiresText: true,
  },

  // 后厨 Kitchen
  {
    id: 'lunch-prep-5',
    title: '收货验货',
    description: '每种原材料上称称重、和送货单核对，误差在±2%以内',
    timeSlot: 'lunch-prep',
    startTime: '10:35',
    endTime: '10:50',
    role: 'Chef',
    department: '后厨',
    requiresPhoto: true,
    requiresVideo: false,
    requiresText: true,
  },
  {
    id: 'lunch-prep-6',
    title: '食品安全检查',
    description: '原材料效期检查，临期或过期变质的原材料半成品需进行记录并处理',
    timeSlot: 'lunch-prep',
    startTime: '10:35',
    endTime: '10:45',
    role: 'Chef',
    department: '后厨',
    requiresPhoto: true,
    requiresVideo: false,
    requiresText: true,
  },
  {
    id: 'lunch-prep-7',
    title: '食材准备',
    description: '根据当日预估销售额与桌数进行备货',
    timeSlot: 'lunch-prep',
    startTime: '10:35',
    endTime: '11:30',
    role: 'Chef',
    department: '后厨',
    requiresPhoto: false,
    requiresVideo: false,
    requiresText: true,
  },
  {
    id: 'lunch-prep-8',
    title: '开市巡店验收',
    description: '根据检查清单逐一检查确保开市工作准备完毕',
    timeSlot: 'lunch-prep',
    startTime: '11:15',
    endTime: '11:25',
    role: 'Chef',
    department: '后厨',
    requiresPhoto: false,
    requiresVideo: false,
    requiresText: true,
  },

  // Add more time slots as needed...
]

// Generate tasks for today based on current time
export function generateTodayTasks(role: 'Manager' | 'Chef'): Task[] {
  const today = new Date()
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

    const now = new Date()
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
export function getCurrentTask(tasks: Task[]): Task | null {
  const now = new Date()
  return tasks.find(task => 
    task.status === 'active' || 
    (task.status === 'upcoming' && task.scheduledStartTime.getTime() > now.getTime())
  ) || null
}

// Calculate time remaining for a task
export function getTimeRemaining(task: Task): {
  total: number
  hours: number
  minutes: number
  seconds: number
  isOverdue: boolean
} {
  const now = new Date()
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