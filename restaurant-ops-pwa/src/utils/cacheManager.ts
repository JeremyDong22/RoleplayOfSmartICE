/**
 * 缓存管理器 - 自动清理浏览器缓存
 * Created: 2025-08-03
 * 
 * 功能：
 * 1. 版本控制 - 检测应用版本变化自动清理缓存
 * 2. 开发模式自动清理
 * 3. 手动清理功能
 * 4. HTTP请求缓存控制
 */

import { initializeHttpInterceptor } from './httpInterceptor'

// 应用版本号 - 每次部署时更新此版本号
export const APP_VERSION = '1.0.1' // 更新版本号会触发缓存清理

const VERSION_KEY = 'app_version'
const LAST_CLEANUP_KEY = 'last_cache_cleanup'

/**
 * 清理所有缓存
 */
export async function clearAllCaches(): Promise<void> {
  // Starting cache cleanup...
  
  // 1. 清理 localStorage - 保留关键信息
  const keysToPreserve = [
    'supabase.auth.token',  // 保留认证信息
    'sb-',                  // 保留所有 Supabase 相关的键
    'user_',                // 保留用户信息
    'role_'                 // 保留角色信息
  ]
  const allKeys = Object.keys(localStorage)
  allKeys.forEach(key => {
    if (!keysToPreserve.some(preserve => key.includes(preserve))) {
      localStorage.removeItem(key)
    }
  })
  
  // 2. 清理 sessionStorage - 但保留路由相关信息
  const sessionKeysToPreserve = ['router', 'navigation', 'history']
  const sessionKeys = Object.keys(sessionStorage)
  sessionKeys.forEach(key => {
    if (!sessionKeysToPreserve.some(preserve => key.includes(preserve))) {
      sessionStorage.removeItem(key)
    }
  })
  
  // 3. 清理 Service Worker 缓存
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
      // Service Worker caches cleared
    } catch (error) {
      // Error clearing caches
    }
  }
  
  // 4. 注销并重新注册 Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
      }
      // Service Workers unregistered
      
      // 重新注册会在页面刷新后自动进行
    } catch (error) {
      // Error managing service workers
    }
  }
  
  // 记录清理时间
  localStorage.setItem(LAST_CLEANUP_KEY, new Date().toISOString())
  // Cache cleanup completed
}

/**
 * 检查是否需要清理缓存
 */
export async function checkAndClearCacheIfNeeded(): Promise<boolean> {
  // 1. 检查版本变化
  const storedVersion = localStorage.getItem(VERSION_KEY)
  const needsCleanup = storedVersion !== APP_VERSION
  
  // 2. 开发环境下，只有在版本变化时才清理缓存
  // 避免每次页面加载都清理缓存导致的无限刷新
  const isDevelopment = import.meta.env.DEV
  
  if (needsCleanup) {
    // Cache cleanup needed. Version changed
    
    await clearAllCaches()
    
    // 更新存储的版本号
    localStorage.setItem(VERSION_KEY, APP_VERSION)
    
    return true
  }
  
  // 开发模式下只清理缓存但不触发刷新
  if (isDevelopment) {
    // Development mode: Clearing caches without refresh
    await clearAllCaches()
    // 更新版本号以防止下次加载时再次清理
    localStorage.setItem(VERSION_KEY, APP_VERSION)
    // 返回 false 以避免触发页面刷新
    return false
  }
  
  return false
}

/**
 * 强制刷新页面（清理内存缓存）
 */
export function forceRefresh(): void {
  // 使用 location.reload(true) 强制从服务器重新加载
  // 注意：现代浏览器中 reload() 的 forceReload 参数已被弃用
  // 但我们仍然可以通过清理缓存后刷新来达到类似效果
  window.location.reload()
}

/**
 * 添加缓存破坏参数到URL
 */
export function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${APP_VERSION}&_t=${Date.now()}`
}

/**
 * 在开发模式下禁用缓存的 fetch 包装器
 */
export async function fetchWithoutCache(url: string, options?: RequestInit): Promise<Response> {
  const isDevelopment = import.meta.env.DEV
  
  const fetchOptions: RequestInit = {
    ...options,
    // 在开发模式下禁用缓存
    ...(isDevelopment && {
      cache: 'no-store',
      headers: {
        ...options?.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
  
  // 在开发模式下添加缓存破坏参数
  const finalUrl = isDevelopment ? addCacheBuster(url) : url
  
  return fetch(finalUrl, fetchOptions)
}

/**
 * 初始化缓存管理器
 */
export async function initializeCacheManager(): Promise<void> {
  // 暂时禁用自动缓存刷新逻辑，避免无限刷新问题
  // Auto cache refresh disabled for debugging
  return
  
  // 初始化HTTP拦截器（仅在开发模式下）
  if (import.meta.env.DEV) {
    initializeHttpInterceptor()
  }
  
  // 检查并清理缓存
  const cleaned = await checkAndClearCacheIfNeeded()
  
  if (cleaned) {
    // Page will refresh after cache cleanup...
    // 给一点时间让清理操作完成
    setTimeout(() => {
      forceRefresh()
    }, 100)
  }
  
  // 监听版本更新事件（可以通过 WebSocket 或轮询实现）
  // 这里提供一个简单的示例
  if (import.meta.env.DEV) {
    // Development mode: Cache will be cleared on every page load
  }
}

// 导出一个全局函数供调试使用
if (typeof window !== 'undefined') {
  (window as any).clearAppCache = async () => {
    await clearAllCaches()
    // Cache cleared! Refreshing page...
    setTimeout(() => forceRefresh(), 100)
  }
  
  // Debug function available: window.clearAppCache()
}