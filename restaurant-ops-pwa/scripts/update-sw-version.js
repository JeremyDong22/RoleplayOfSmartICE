// Script to update service worker version during build
// Replaces __BUILD_VERSION__ placeholder with timestamp or git commit hash

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version identifier (try git commit hash first, fallback to timestamp)
function getVersion() {
  try {
    // Try to get git commit hash
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    return `git-${gitHash}`;
  } catch (error) {
    // Fallback to timestamp if git is not available
    return `t-${Date.now()}`;
  }
}

// Update service worker file
function updateServiceWorker() {
  const version = getVersion();
  const swPath = path.resolve(__dirname, '../public/sw.js');
  const distSwPath = path.resolve(__dirname, '../dist/sw.js');
  
  // Read the service worker file
  let swContent = fs.readFileSync(swPath, 'utf8');
  
  // Replace the version placeholder
  swContent = swContent.replace('__BUILD_VERSION__', version);
  
  // Write to dist folder if it exists (for production build)
  if (fs.existsSync(path.dirname(distSwPath))) {
    fs.writeFileSync(distSwPath, swContent);
    console.log(`✅ Updated service worker in dist with version: ${version}`);
  }
  
  // Also update the source file temporarily for dev server
  const originalContent = fs.readFileSync(swPath, 'utf8');
  fs.writeFileSync(swPath, swContent);
  console.log(`✅ Updated service worker with version: ${version}`);
  
  // Restore original after a moment (for dev)
  process.on('exit', () => {
    if (fs.existsSync(swPath)) {
      fs.writeFileSync(swPath, originalContent);
    }
  });
}

updateServiceWorker();