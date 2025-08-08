// Direct upload to Supabase Storage using fetch API
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://wdpeoyugsxqnpwwtkqsl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcGVveXVnc3hxbnB3d3RrcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NzUxNjAsImV4cCI6MjA1MTE1MTE2MH0.l6ecEwN13FMXb6jaS5TlQNkw6kabfaBYuYPnN5k0sUg';

async function uploadFile(filePath, storagePath) {
  const fileContent = await fs.readFile(filePath);
  
  const url = `${SUPABASE_URL}/storage/v1/object/RolePlay/${storagePath}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true'
    },
    body: fileContent
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

async function main() {
  const sampleMapping = [
    {
      dir: '值班经理/8-闭店-能源安全检查',
      taskId: '576db171-4bdd-4572-8c73-cb84d8c58fef',
      taskName: '能源安全检查',
      texts: {
        'sample1.txt': '确保天然气阀门关闭（垂直于管道）',
        'sample2.txt': '灯光按钮关闭，灭蝇灯，主机供电，门牌灯除外'
      }
    },
    {
      dir: '值班经理/8-闭店-安防闭店检查',
      taskId: 'd1234428-ca63-4c8e-aeed-90baec172910',
      taskName: '安防闭店检查',
      texts: {
        'sample1.txt': '确认报警系统开启，窗户锁好，再关闭并锁大门',
        'sample2.txt': '门店闭店一览，将门窗都拍到'
      }
    },
    {
      dir: '值班经理/8-闭店-营业数据记录',
      taskId: '50db2167-b974-433e-a7ba-853e6d719e01',
      taskName: '营业数据记录',
      texts: {
        'sample1.txt': '营业额票据',
        'sample2.txt': '美团营业额概览界面'
      }
    }
  ];

  for (const mapping of sampleMapping) {
    console.log(`\nProcessing ${mapping.taskName}...`);
    
    const basePath = path.join(__dirname, '../public/task-samples', mapping.dir);
    const files = await fs.readdir(basePath);
    const jpgFiles = files.filter(f => f.endsWith('.jpg')).sort();
    
    const uploadedImages = {};
    
    for (const file of jpgFiles) {
      const filePath = path.join(basePath, file);
      const storagePath = `samples/duty-manager/${mapping.taskId}/${file}`;
      
      console.log(`  Uploading ${file}...`);
      
      try {
        await uploadFile(filePath, storagePath);
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/RolePlay/${storagePath}`;
        console.log(`    ✅ Success: ${publicUrl}`);
        
        // Group by sample number
        const match = file.match(/sample(\d+)/);
        if (match) {
          const sampleNum = match[1];
          if (!uploadedImages[sampleNum]) {
            uploadedImages[sampleNum] = [];
          }
          uploadedImages[sampleNum].push(publicUrl);
        }
      } catch (error) {
        console.error(`    ❌ Failed: ${error.message}`);
      }
    }
    
    // Generate update SQL
    const samples = Object.entries(uploadedImages).map(([num, urls]) => {
      const textKey = `sample${num}.txt`;
      return {
        images: urls,
        text: mapping.texts[textKey] || `样本 ${num}`
      };
    });
    
    if (samples.length > 0) {
      console.log(`\n-- SQL to update ${mapping.taskName}:`);
      console.log(`UPDATE roleplay_tasks`);
      console.log(`SET samples = '${JSON.stringify({ samples })}'::jsonb`);
      console.log(`WHERE id = '${mapping.taskId}';`);
    }
  }
}

main().catch(console.error);