// Upload duty manager sample images using the same approach as the app
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client directly
const supabaseUrl = 'https://wdpeoyugsxqnpwwtkqsl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcGVveXVnc3hxbnB3d3RrcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NzUxNjAsImV4cCI6MjA1MTE1MTE2MH0.l6ecEwN13FMXb6jaS5TlQNkw6kabfaBYuYPnN5k0sUg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'RolePlay';

async function fileToBlob(filePath: string): Promise<Blob> {
  const buffer = fs.readFileSync(filePath);
  return new Blob([buffer], { type: 'image/jpeg' });
}

async function uploadSampleImage(filePath: string, storagePath: string) {
  try {
    const blob = await fileToBlob(filePath);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true // Allow overwriting for samples
      });
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);
    
    return publicUrl;
  } catch (error) {
    console.error(`Failed to upload ${storagePath}:`, error);
    throw error;
  }
}

async function main() {
  const sampleMapping = [
    {
      dir: '值班经理/8-闭店-能源安全检查',
      taskId: '576db171-4bdd-4572-8c73-cb84d8c58fef',
      taskName: '能源安全检查',
      texts: {
        'sample1': '确保天然气阀门关闭（垂直于管道）',
        'sample2': '灯光按钮关闭，灭蝇灯，主机供电，门牌灯除外'
      }
    },
    {
      dir: '值班经理/8-闭店-安防闭店检查',
      taskId: 'd1234428-ca63-4c8e-aeed-90baec172910',
      taskName: '安防闭店检查',
      texts: {
        'sample1': '确认报警系统开启，窗户锁好，再关闭并锁大门',
        'sample2': '门店闭店一览，将门窗都拍到'
      }
    },
    {
      dir: '值班经理/8-闭店-营业数据记录',
      taskId: '50db2167-b974-433e-a7ba-853e6d719e01',
      taskName: '营业数据记录',
      texts: {
        'sample1': '营业额票据',
        'sample2': '美团营业额概览界面'
      }
    }
  ];

  console.log('🚀 Starting upload of duty manager sample images...\n');

  for (const mapping of sampleMapping) {
    console.log(`📁 Processing ${mapping.taskName}...`);
    
    const basePath = path.join(__dirname, '../../public/task-samples', mapping.dir);
    const files = fs.readdirSync(basePath);
    const jpgFiles = files.filter(f => f.endsWith('.jpg')).sort();
    
    const uploadedSamples: any = {};
    
    for (const file of jpgFiles) {
      const filePath = path.join(basePath, file);
      const storagePath = `samples/duty-manager/${mapping.taskId}/${file}`;
      
      process.stdout.write(`  📤 Uploading ${file}...`);
      
      try {
        const publicUrl = await uploadSampleImage(filePath, storagePath);
        console.log(` ✅ Success!`);
        console.log(`     URL: ${publicUrl}`);
        
        // Group by sample number
        const match = file.match(/sample(\d+)/);
        if (match) {
          const sampleNum = `sample${match[1]}`;
          if (!uploadedSamples[sampleNum]) {
            uploadedSamples[sampleNum] = {
              images: [],
              text: mapping.texts[sampleNum] || ''
            };
          }
          uploadedSamples[sampleNum].images.push(publicUrl);
        }
      } catch (error: any) {
        console.log(` ❌ Failed!`);
        console.error(`     Error: ${error.message}`);
      }
    }
    
    // Generate SQL update
    if (Object.keys(uploadedSamples).length > 0) {
      const samples = Object.values(uploadedSamples);
      
      console.log(`\n  📝 SQL Update Statement:`);
      console.log(`  UPDATE roleplay_tasks`);
      console.log(`  SET samples = '${JSON.stringify({ samples })}'::jsonb`);
      console.log(`  WHERE id = '${mapping.taskId}';\n`);
      
      // Actually run the update
      const { error } = await supabase
        .from('roleplay_tasks')
        .update({ samples: { samples } })
        .eq('id', mapping.taskId);
      
      if (error) {
        console.error(`  ⚠️ Failed to update database: ${error.message}`);
      } else {
        console.log(`  ✅ Database updated successfully!`);
      }
    }
  }
  
  console.log('\n✨ Upload process complete!');
}

// Run the script
main().catch(console.error);