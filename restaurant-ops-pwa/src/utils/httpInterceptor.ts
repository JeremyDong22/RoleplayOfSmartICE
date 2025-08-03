/**
 * HTTP请求拦截器 - 开发模式下禁用缓存
 * Created: 2025-08-03
 */

import { APP_VERSION } from './cacheManager'

// 保存原始的fetch函数
const originalFetch = window.fetch

// 重写fetch函数
window.fetch = async function(...args) {
  const [resource, config] = args
  
  // 仅在开发模式下修改请求
  if (import.meta.env.DEV) {
    const url = typeof resource === 'string' ? resource : resource.url
    
    // 为URL添加版本参数（处理相对和绝对URL）
    let modifiedUrl: string
    try {
      const urlObj = new URL(url, window.location.origin)
      // 只为同源请求添加缓存破坏参数
      if (urlObj.origin === window.location.origin || !urlObj.protocol.startsWith('http')) {
        urlObj.searchParams.set('_v', APP_VERSION)
        urlObj.searchParams.set('_t', Date.now().toString())
      }
      modifiedUrl = urlObj.toString()
    } catch {
      // 如果URL解析失败，直接使用原URL
      modifiedUrl = url
    }
    
    // 修改请求配置
    const modifiedConfig: RequestInit = {
      ...config,
      cache: 'no-store',
      headers: {
        ...config?.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }
    
    // 使用修改后的URL和配置
    return originalFetch(modifiedUrl, modifiedConfig)
  }
  
  // 生产模式下使用原始请求
  return originalFetch(...args)
}

// 为XMLHttpRequest添加缓存控制（某些库可能使用）
if (import.meta.env.DEV) {
  const originalOpen = XMLHttpRequest.prototype.open
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader
  
  XMLHttpRequest.prototype.open = function(method: string, url: string, ...rest: any[]) {
    // 为URL添加缓存破坏参数
    let modifiedUrl: string
    try {
      const urlObj = new URL(url, window.location.origin)
      if (urlObj.origin === window.location.origin || !urlObj.protocol.startsWith('http')) {
        urlObj.searchParams.set('_v', APP_VERSION)
        urlObj.searchParams.set('_t', Date.now().toString())
      }
      modifiedUrl = urlObj.toString()
    } catch {
      modifiedUrl = url
    }
    
    // 调用原始的open方法
    originalOpen.apply(this, [method, modifiedUrl, ...rest])
  }
  
  XMLHttpRequest.prototype.setRequestHeader = function(name: string, value: string) {
    originalSetRequestHeader.apply(this, [name, value])
    
    // 在send之前添加缓存控制头
    if (name.toLowerCase() !== 'cache-control' && name.toLowerCase() !== 'pragma') {
      originalSetRequestHeader.apply(this, ['Cache-Control', 'no-cache, no-store, must-revalidate'])
      originalSetRequestHeader.apply(this, ['Pragma', 'no-cache'])
    }
  }
}

export function initializeHttpInterceptor() {
  console.log('[HttpInterceptor] Initialized - Cache disabled in development mode')
}