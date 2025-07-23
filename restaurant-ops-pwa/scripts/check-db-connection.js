#!/usr/bin/env node

/**
 * 检查数据库连接状态的脚本
 * 使用方法: node scripts/check-db-connection.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  console.log('🔍 检查数据库连接...\n');
  
  try {
    // 1. 测试基本连接
    console.log('1️⃣ 测试基本连接...');
    const { data: users, error: userError } = await supabase
      .from('roleplay_users')
      .select('id')
      .limit(1);
    
    if (userError) {
      console.error('❌ 连接失败:', userError.message);
      return;
    }
    console.log('✅ 基本连接成功\n');
    
    // 2. 检查表结构
    console.log('2️⃣ 检查数据库表...');
    const tables = [
      'roleplay_restaurants',
      'roleplay_roles', 
      'roleplay_users',
      'roleplay_workflow_periods',
      'roleplay_tasks',
      'roleplay_task_records',
      'roleplay_user_presence'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: 错误 - ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count} 条记录`);
      }
    }
    
    // 3. 检查任务数据
    console.log('\n3️⃣ 检查任务数据...');
    const { data: taskStats, error: taskError } = await supabase
      .from('roleplay_tasks')
      .select('role_code');
    
    if (taskStats && !taskError) {
      const roleCounts = taskStats.reduce((acc, task) => {
        acc[task.role_code] = (acc[task.role_code] || 0) + 1;
        return acc;
      }, {});
      
      console.log('任务分布:');
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`  - ${role}: ${count} 个任务`);
      });
    }
    
    // 4. 检查 Realtime 配置
    console.log('\n4️⃣ 检查 Realtime 配置...');
    const channel = supabase.channel('test-channel');
    
    await new Promise((resolve) => {
      channel
        .on('system', { event: '*' }, (payload) => {
          console.log('✅ Realtime 连接成功');
          resolve();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ WebSocket 订阅成功');
            setTimeout(resolve, 1000);
          }
        });
    });
    
    channel.unsubscribe();
    
    console.log('\n✨ 所有检查完成！数据库连接正常。');
    
  } catch (error) {
    console.error('❌ 发生错误:', error);
  }
}

// 运行检查
checkConnection();