// Input Sanitization Utilities
// Prevent XSS attacks by sanitizing user inputs

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  }
  
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char)
}

/**
 * Sanitize user input for safe display
 * Removes potentially dangerous characters and scripts
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  // Remove script tags and event handlers
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/on\w+\s*=\s*[^\s]*/gi, '')
  
  // Escape remaining HTML
  return escapeHtml(sanitized)
}

/**
 * Validate and sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/^\.+/, '')
  
  // Remove special characters except common ones
  sanitized = sanitized.replace(/[^a-zA-Z0-9._\- ]/g, '')
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || ''
    const name = sanitized.substring(0, 250 - ext.length - 1)
    sanitized = `${name}.${ext}`
  }
  
  return sanitized || 'unnamed'
}

/**
 * Validate SQL parameter to prevent injection
 */
export function validateSqlParam(param: string): string {
  // Only allow alphanumeric, dash, and underscore
  if (!/^[a-zA-Z0-9_-]+$/.test(param)) {
    throw new Error('Invalid parameter format')
  }
  return param
}