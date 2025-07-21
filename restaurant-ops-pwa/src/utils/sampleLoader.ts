// Load sample content from public/task-samples folder for placeholder text
// Created to support showing sample text as placeholder in input dialogs
// Updated: Fixed task ID mappings to match workflowParser.ts IDs
// - Added missing hygiene inspection tasks (lunch-prep-manager-1, etc.)
// - Corrected mismatched task IDs for all roles (Manager, Chef, DutyManager)
// - Added missing tasks like opening equipment checks and closing security checks

export interface TaskSample {
  content: string
  isTemplate: boolean  // true if it's a template with blank fields
}

// Map task IDs to their sample folder paths
const taskSamplePathMap: Record<string, string> = {
  // 前厅任务
  'opening-manager-1': '前厅/1-开店-召开早会',
  'opening-manager-2': '前厅/1-开店-开店准备与设备检查',
  'lunch-prep-manager-1': '前厅/2 - 开市寻店验收 - 卫生',  // Added lunch hygiene inspection mapping
  'lunch-prep-manager-2': '前厅/2 - 开市寻店验收 - 物资准备',
  'lunch-closing-manager-1': '前厅/4-餐后收市午市-收市清洁检查',
  'dinner-prep-manager-1': '前厅/5-餐前准备晚市-召开午会',
  'dinner-prep-manager-2': '前厅/5-餐前准备晚市-开市寻店验收 - 卫生',
  'dinner-prep-manager-3': '前厅/5-餐前准备晚市-开市寻店验收 - 物资准备',
  'pre-closing-manager-2': '前厅/7-预打烊晚市-值班安排',
  'pre-closing-manager-1': '前厅/7-预打烊晚市-收市准备',
  'closing-manager-4': '前厅/8-闭店-当日复盘总结',
  'closing-manager-2': '前厅/8-闭店-营业数据记录',
  'closing-manager-5': '前厅/8-闭店-能源安全检查',
  'closing-manager-6': '前厅/8-闭店-安防闭店检查',
  
  // 后厨任务
  'opening-chef-1': '后厨/1-开店-开店准备与设备检查',
  'lunch-prep-chef-1': '后厨/2-餐前准备午市-食品安全检查',
  'lunch-prep-chef-3': '后厨/2-餐前准备午市-开始巡店验收',
  'lunch-closing-chef-1': '后厨/4-餐后收市午市-收市清洁检查',
  'dinner-prep-chef-1': '后厨/5-餐前准备晚市-召开午会',
  'dinner-prep-chef-2': '后厨/5-餐前准备晚市-食品安全检查',
  'dinner-prep-chef-4': '后厨/5-餐前准备晚市-巡店验收',
  'pre-closing-chef-3': '后厨/7-预打烊晚市-值班安排',
  'pre-closing-chef-2': '后厨/7-预打烊晚市-收市准备',
  'pre-closing-chef-1': '后厨/7-预打烊晚市-食材下单',
  'pre-closing-chef-4': '后厨/7-预打烊晚市-损耗称重',
  
  // 浮动任务（后厨）
  'floating-receiving': '后厨特殊任务/收货验货',
  'floating-meat-processing': '后厨特殊任务/交割损耗称重',
  
  // 值班经理任务
  'lunch-duty-manager-1': '值班经理/4-餐后收市午市-能源管理',
  'lunch-duty-manager-2': '值班经理/4-餐后收市午市-营业款核对',
  'closing-duty-manager-2': '值班经理/8-闭店-安防闭店检查',
  'closing-duty-manager-1': '值班经理/8-闭店-能源安全检查',
}

// Extract placeholder text from sample file
function extractPlaceholder(content: string): string {
  // Trim whitespace and return the content directly
  // This allows users to edit the sample files to control placeholders
  const trimmedContent = content.trim()
  
  // If the content is empty, return default placeholder
  if (!trimmedContent) {
    return '请根据实际情况填写记录内容'
  }
  
  // If content is too long (over 100 characters), truncate it
  if (trimmedContent.length > 100) {
    return trimmedContent.substring(0, 97) + '...'
  }
  
  return trimmedContent
}

// Load sample content for a task
export async function loadTaskSample(taskId: string): Promise<TaskSample | null> {
  const folderPath = taskSamplePathMap[taskId]
  if (!folderPath) {
    return null
  }
  
  try {
    // Try to load sample1.txt first
    const response = await fetch(`/task-samples/${folderPath}/sample1.txt`)
    if (!response.ok) {
      return null
    }
    
    const content = await response.text()
    const isTemplate = content.includes('____')
    
    return {
      content: extractPlaceholder(content),
      isTemplate
    }
  } catch (error) {
    console.error('Error loading task sample:', error)
    return null
  }
}

// Get all sample content for preview (for debugging)
export async function loadFullSampleContent(taskId: string): Promise<string | null> {
  const folderPath = taskSamplePathMap[taskId]
  if (!folderPath) {
    return null
  }
  
  try {
    const response = await fetch(`/task-samples/${folderPath}/sample1.txt`)
    if (!response.ok) {
      return null
    }
    
    return await response.text()
  } catch (error) {
    console.error('Error loading sample content:', error)
    return null
  }
}