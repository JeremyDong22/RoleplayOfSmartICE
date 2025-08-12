#!/bin/bash
# 手动运行清理脚本
# 使用方法: ./scripts/manual-cleanup.sh

echo "🧹 开始清理孤立照片..."

curl -X POST https://wdpeoyugsxqnpwwtkqsl.supabase.co/functions/v1/cleanup-orphaned-photos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcGVveXVnc3hxbnB3d3RrcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNDgwNzgsImV4cCI6MjA1OTcyNDA3OH0.9bUpuZCOZxDSH3KsIu6FwWZyAvnV5xPJGNpO3luxWOE" \
  -H "Content-Type: application/json" \
  -d '{"manual": true}' | python3 -m json.tool

echo "✅ 清理完成!"