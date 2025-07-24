// 静默检查文件是否存在的工具函数
// 不会在控制台产生404错误

export function checkFileExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('HEAD', url, true)
    
    // 设置超时
    xhr.timeout = 5000
    
    xhr.onload = () => {
      resolve(xhr.status === 200)
    }
    
    xhr.onerror = () => {
      resolve(false)
    }
    
    xhr.ontimeout = () => {
      resolve(false)
    }
    
    // 静默处理所有错误
    try {
      xhr.send()
    } catch {
      resolve(false)
    }
  })
}

export async function loadExistingFiles(baseDir: string, sampleIndex: number): Promise<{
  textFile: string | null
  imageFiles: string[]
}> {
  const result = {
    textFile: null as string | null,
    imageFiles: [] as string[]
  }
  
  // 检查文本文件
  const textPath = `/task-samples/${baseDir}/sample${sampleIndex}.txt`
  if (await checkFileExists(textPath)) {
    result.textFile = textPath
  }
  
  // 检查图片文件（最多10张）
  for (let i = 1; i <= 10; i++) {
    const imagePath = `/task-samples/${baseDir}/sample${sampleIndex}-${i}.jpg`
    if (await checkFileExists(imagePath)) {
      result.imageFiles.push(imagePath)
    } else {
      // 如果当前图片不存在，后续的通常也不存在
      break
    }
  }
  
  return result
}