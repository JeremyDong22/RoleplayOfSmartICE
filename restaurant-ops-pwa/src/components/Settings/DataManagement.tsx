// 数据管理设置组件
// 允许用户查看和控制数据清理

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { useDailyCleanup } from '@/hooks/useDailyCleanup'

export function DataManagement() {
  const { status, triggerManualCleanup, getTimeUntilNextCleanup } = useDailyCleanup()
  
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          数据管理
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 自动清理状态 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              每日自动清理
            </h3>
            {status.isScheduled ? (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                已启用
              </span>
            ) : (
              <span className="text-sm text-gray-500">未启用</span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            系统将在每天早上8:00自动清理所有任务数据和照片，与门店关闭时间同步。
          </p>
          
          {status.nextCleanupTime && (
            <div className="text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">下次清理时间:</span>
                <span className="font-medium">
                  明天 08:00 ({getTimeUntilNextCleanup()})
                </span>
              </div>
              
              {status.lastCleanupTime && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500">上次清理:</span>
                  <span className="font-medium">
                    {status.lastCleanupTime.toLocaleDateString()} 08:00
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 清理统计 */}
        {status.lastCleanupStats && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">上次清理结果</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">清理存储项:</span>
                <span className="ml-2 font-medium">
                  {status.lastCleanupStats.localStorageCleared} 个
                </span>
              </div>
              <div>
                <span className="text-gray-500">删除照片:</span>
                <span className="ml-2 font-medium">
                  {status.lastCleanupStats.photosDeleted} 张
                </span>
              </div>
              {status.lastCleanupStats.errors > 0 && (
                <div className="col-span-2 text-red-600">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  清理时发生 {status.lastCleanupStats.errors} 个错误
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 手动清理 */}
        <div className="border-t pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">手动清理</h3>
              <p className="text-sm text-gray-600 mb-3">
                立即清理所有数据。这将删除所有任务记录、照片和临时数据。
                此操作不可撤销！
              </p>
              <Button
                variant="destructive"
                onClick={triggerManualCleanup}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                立即清理所有数据
              </Button>
            </div>
          </div>
        </div>
        
        {/* 说明 */}
        <div className="bg-amber-50 p-4 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">清理说明</h4>
          <ul className="space-y-1 text-gray-700">
            <li>• 每日清理会删除所有任务记录和未上传的照片</li>
            <li>• 用户设置和角色选择会被保留</li>
            <li>• 清理在早上8点自动执行，确保新一天的开始</li>
            <li>• 重要数据请确保已上传到服务器</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}