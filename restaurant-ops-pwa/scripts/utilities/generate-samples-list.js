import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function scanDirectory(dir, baseDir = '') {
  const result = {};
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      const subResult = scanDirectory(fullPath, path.join(baseDir, item));
      if (Object.keys(subResult).length > 0) {
        result[item] = subResult;
      }
    } else if (item.match(/\.(jpg|txt|json)$/)) {
      if (!result.files) result.files = [];
      result.files.push(item);
    }
  });
  
  return result;
}

const samplesDir = path.join(__dirname, '../public/task-samples');
const structure = scanDirectory(samplesDir);

fs.writeFileSync(
  path.join(__dirname, '../public/task-samples-structure.json'),
  JSON.stringify(structure, null, 2)
);

console.log('Generated task-samples-structure.json');