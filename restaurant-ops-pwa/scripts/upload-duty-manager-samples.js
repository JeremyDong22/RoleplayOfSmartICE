// Script to upload duty manager sample images to Supabase storage
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://wdpeoyugsxqnpwwtkqsl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcGVveXVnc3hxbnB3d3RrcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NzUxNjAsImV4cCI6MjA1MTE1MTE2MH0.l6ecEwN13FMXb6jaS5TlQNkw6kabfaBYuYPnN5k0sUg';

// Service role key for admin access (you'll need to get this from Supabase dashboard)
// Go to Settings > API and copy the service_role key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadSamples() {
  const sampleMapping = [
    {
      dir: '值班经理/8-闭店-能源安全检查',
      taskId: '576db171-4bdd-4572-8c73-cb84d8c58fef',
      taskName: '能源安全检查'
    },
    {
      dir: '值班经理/8-闭店-安防闭店检查',
      taskId: 'd1234428-ca63-4c8e-aeed-90baec172910',
      taskName: '安防闭店检查'
    },
    {
      dir: '值班经理/8-闭店-营业数据记录',
      taskId: '50db2167-b974-433e-a7ba-853e6d719e01',
      taskName: '营业数据记录'
    }
  ];

  const uploadedFiles = {};

  for (const mapping of sampleMapping) {
    const basePath = path.join(__dirname, '../public/task-samples', mapping.dir);
    uploadedFiles[mapping.taskId] = [];
    
    try {
      const files = await fs.readdir(basePath);
      const jpgFiles = files.filter(f => f.endsWith('.jpg')).sort();
      
      console.log(`\nProcessing ${mapping.taskName}...`);
      console.log(`Found ${jpgFiles.length} image files`);
      
      for (const file of jpgFiles) {
        const filePath = path.join(basePath, file);
        const fileContent = await fs.readFile(filePath);
        
        // Create a simple path structure for samples
        const storagePath = `samples/duty-manager/${mapping.taskId}/${file}`;
        
        console.log(`  Uploading ${file} to ${storagePath}...`);
        
        // First, try to delete any existing file at this path
        await supabase.storage
          .from('RolePlay')
          .remove([storagePath]);
        
        // Now upload the new file
        const { data, error } = await supabase.storage
          .from('RolePlay')
          .upload(storagePath, fileContent, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true // Allow overwriting
          });
        
        if (error) {
          console.error(`    Error: ${error.message}`);
        } else {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/RolePlay/${storagePath}`;
          console.log(`    Success! URL: ${publicUrl}`);
          uploadedFiles[mapping.taskId].push({
            file: file,
            url: publicUrl
          });
        }
      }
      
      // Also read and display the text files for reference
      const txtFiles = files.filter(f => f.endsWith('.txt'));
      const textContents = {};
      for (const txtFile of txtFiles) {
        const txtPath = path.join(basePath, txtFile);
        const content = await fs.readFile(txtPath, 'utf-8');
        textContents[txtFile] = content.trim();
      }
      
      if (Object.keys(textContents).length > 0) {
        console.log(`  Text contents:`, textContents);
      }
      
    } catch (err) {
      console.error(`Error processing ${mapping.taskName}:`, err.message);
    }
  }

  // Generate SQL update statements
  console.log('\n=== SQL Update Statements ===\n');
  
  for (const mapping of sampleMapping) {
    const files = uploadedFiles[mapping.taskId];
    if (files && files.length > 0) {
      // Group files by sample number
      const samples = {};
      files.forEach(f => {
        const match = f.file.match(/sample(\d+)/);
        if (match) {
          const sampleNum = match[1];
          if (!samples[sampleNum]) {
            samples[sampleNum] = [];
          }
          samples[sampleNum].push(f.url);
        }
      });
      
      // Create the samples JSON structure
      const samplesJson = {
        samples: Object.entries(samples).map(([num, urls]) => ({
          images: urls,
          text: `样本 ${num}` // You can update this with actual text
        }))
      };
      
      console.log(`-- Update ${mapping.taskName}`);
      console.log(`UPDATE roleplay_tasks`);
      console.log(`SET samples = '${JSON.stringify(samplesJson)}'::jsonb`);
      console.log(`WHERE id = '${mapping.taskId}';`);
      console.log();
    }
  }
}

// Run the script
uploadSamples()
  .then(() => console.log('\n✅ Upload process complete'))
  .catch(err => console.error('\n❌ Upload failed:', err));