/**
 * useInventoryItems Hook
 * Created: 2025-08-21
 * Purpose: 管理库存物品数据的获取和缓存
 */

import { useState, useEffect } from 'react'
import { inventoryService } from '../../services/inventoryService'
import type { InventoryItem } from './types'

export const useInventoryItems = (department: '前厅' | '后厨') => {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let mounted = true
    
    const loadItems = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 使用 inventoryService 获取数据（包含缓存机制）
        const data = await inventoryService.getInventoryItems(department)
        
        if (mounted) {
          setItems(data)
        }
      } catch (err) {
        if (mounted) {
          setError('加载物品列表失败')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    loadItems()
    
    // 清理函数
    return () => {
      mounted = false
    }
  }, [department])
  
  // 刷新数据的方法
  const refresh = async () => {
    inventoryService.clearCache()
    setLoading(true)
    try {
      const data = await inventoryService.getInventoryItems(department)
      setItems(data)
      setError(null)
    } catch (err) {
      setError('刷新物品列表失败')
    } finally {
      setLoading(false)
    }
  }
  
  return { items, loading, error, refresh }
}