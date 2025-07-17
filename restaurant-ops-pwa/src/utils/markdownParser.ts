// Parse workflow from markdown file
import { readFileSync } from 'fs'
import path from 'path'

export interface TaskTemplate {
  id: string
  title: string
  description: string
  isNotice: boolean
  role: 'Manager' | 'Chef'
  department: '前厅' | '后厨'
  requiresPhoto: boolean
  requiresVideo: boolean
  requiresText: boolean
}

export interface WorkflowPeriod {
  id: string
  name: string
  displayName: string
  startTime: string
  endTime: string
  tasks: {
    manager: TaskTemplate[]
    chef: TaskTemplate[]
  }
}

// Parse markdown content to extract workflow structure
export function parseWorkflowFromMarkdown(content: string): WorkflowPeriod[] {
  const periods: WorkflowPeriod[] = []
  const lines = content.split('\n')
  
  let currentPeriod: WorkflowPeriod | null = null
  let currentDepartment: '前厅' | '后厨' | null = null
  let currentTaskIndex = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Period header (e.g., ## 开店（10:00–10:30）)
    if (line.startsWith('## ') && line.includes('（') && line.includes('）')) {
      if (currentPeriod) {
        periods.push(currentPeriod)
      }
      
      const periodMatch = line.match(/## (.+?)（(\d{1,2}:\d{2})(?:–|-)(\d{1,2}:\d{2})/)
      if (periodMatch) {
        const [, displayName, startTime, endTime] = periodMatch
        const id = displayName
          .replace('餐前准备（午市）', 'lunch-prep')
          .replace('餐前准备（晚市）', 'dinner-prep')
          .replace('餐中运营（午市）', 'lunch-service')
          .replace('餐中运营（晚市）', 'dinner-service')
          .replace('餐后收市（午市）', 'lunch-closing')
          .replace('预打烊（晚市）', 'pre-closing')
          .replace('开店', 'opening')
          .replace('闭店', 'closing')
        
        currentPeriod = {
          id,
          name: id,
          displayName,
          startTime,
          endTime,
          tasks: {
            manager: [],
            chef: []
          }
        }
        currentTaskIndex = 0
      }
    }
    
    // Department header (### 前厅 or ### 后厨)
    else if (line === '### 前厅') {
      currentDepartment = '前厅'
    } else if (line === '### 后厨') {
      currentDepartment = '后厨'
    }
    
    // Task line (numbered list item)
    else if (line.match(/^\d+\.\s/) && currentPeriod && currentDepartment) {
      const isNotice = line.includes('**')
      
      // Extract title and description
      let title = ''
      let description = ''
      
      if (isNotice) {
        // Format: 1. **岗位监督管理**：确保各岗位...
        const noticeMatch = line.match(/^\d+\.\s*\*\*(.+?)\*\*：(.+)/)
        if (noticeMatch) {
          title = noticeMatch[1]
          description = noticeMatch[2]
        }
      } else {
        // Format: 1. 卫生准备：吧台、营业区域...
        const taskMatch = line.match(/^\d+\.\s*(.+?)：(.+)/)
        if (taskMatch) {
          title = taskMatch[1]
          description = taskMatch[2]
        }
      }
      
      if (title && description) {
        const role = currentDepartment === '前厅' ? 'Manager' : 'Chef'
        const task: TaskTemplate = {
          id: `${currentPeriod.id}-${role.toLowerCase()}-${++currentTaskIndex}`,
          title,
          description,
          isNotice,
          role,
          department: currentDepartment,
          requiresPhoto: !isNotice && (
            description.includes('检查') || 
            description.includes('清洁') || 
            description.includes('收据') ||
            description.includes('验收')
          ),
          requiresVideo: false,
          requiresText: true
        }
        
        if (role === 'Manager') {
          currentPeriod.tasks.manager.push(task)
        } else {
          currentPeriod.tasks.chef.push(task)
        }
      }
    }
  }
  
  // Add the last period
  if (currentPeriod) {
    periods.push(currentPeriod)
  }
  
  return periods
}

// Load and parse workflow from markdown file
export function loadWorkflowPeriods(): WorkflowPeriod[] {
  try {
    // In browser environment, we'll use a pre-loaded version
    if (typeof window !== 'undefined') {
      // This will be replaced with actual markdown content during build
      return parseWorkflowFromMarkdown(WORKFLOW_MARKDOWN_CONTENT)
    }
    
    // In Node environment (for testing/build)
    const markdownPath = path.join(process.cwd(), '..', '门店日常工作.md')
    const content = readFileSync(markdownPath, 'utf-8')
    return parseWorkflowFromMarkdown(content)
  } catch (error) {
    console.error('Failed to load workflow:', error)
    // Return empty array as fallback
    return []
  }
}

// Pre-loaded markdown content for browser
declare const WORKFLOW_MARKDOWN_CONTENT: string