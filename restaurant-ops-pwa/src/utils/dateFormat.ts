/**
 * 简单的日期格式化工具
 * Created: 2025-08-04
 * 
 * 只处理日期格式化，不涉及时区转换
 * 因为我们的系统已经在数据库层面处理了北京时间
 */

/**
 * 获取本地日期字符串（YYYY-MM-DD格式）
 * 在中国运行时，这就是北京时间的日期
 * @param date 日期对象，默认为当前时间
 * @returns YYYY-MM-DD格式的日期字符串
 */
export function getLocalDateString(date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取营业日期（同步版本，使用默认8小时作为后备）
 * 凌晨0点到切换时间算作前一天的营业日
 * @param date 日期对象，默认为当前时间
 * @param cutoffHour 营业日切换小时数，默认8点
 * @returns YYYY-MM-DD格式的营业日期
 */
export function getBusinessDate(date?: Date, cutoffHour: number = 8): string {
  const d = date || new Date()
  const hours = d.getHours()
  
  // 如果当前时间小于切换时间，算作前一天
  if (hours < cutoffHour) {
    const yesterday = new Date(d)
    yesterday.setDate(yesterday.getDate() - 1)
    return getLocalDateString(yesterday)
  }
  
  return getLocalDateString(d)
}

/**
 * 格式化时间为HH:MM:SS
 * @param date 日期对象
 * @returns HH:MM:SS格式的时间字符串
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期时间
 * @param date 日期对象
 * @returns YYYY-MM-DD HH:MM:SS格式的字符串
 */
export function formatDateTime(date: Date): string {
  return `${getLocalDateString(date)} ${formatTime(date)}`
}