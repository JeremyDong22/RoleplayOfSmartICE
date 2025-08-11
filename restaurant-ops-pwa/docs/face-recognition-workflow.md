# Face Recognition Workflow Documentation

## face-api.js 标准使用流程

### 1. 模型加载 (Model Loading)
face-api.js 需要加载以下预训练模型：
- **TinyFaceDetector**: 轻量级人脸检测模型
- **FaceLandmark68Net**: 检测68个面部特征点
- **FaceRecognitionNet**: 生成128维人脸特征向量
- **FaceExpressionNet**: 表情识别（可选）

```javascript
await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
```

### 2. 人脸采集流程 (Face Enrollment)

#### 标准流程：
1. **多次采集**：采集3-5张不同角度的人脸照片
2. **质量检查**：确保每张照片都能检测到人脸
3. **特征提取**：为每张照片生成128维特征向量
4. **特征融合**：计算多个特征向量的平均值或选择最佳
5. **存储特征**：将特征向量存储到数据库

#### 最佳实践：
```javascript
// 采集多个样本
const descriptors = []
for (let i = 0; i < 3; i++) {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
  
  if (detection) {
    descriptors.push(detection.descriptor)
    // 等待用户调整姿势
    await sleep(1000)
  }
}

// 计算平均特征向量
const avgDescriptor = calculateAverageDescriptor(descriptors)
```

### 3. 人脸识别流程 (Face Verification)

#### 标准流程：
1. **实时检测**：从视频流中检测人脸
2. **特征提取**：生成当前人脸的特征向量
3. **特征比对**：计算与存储特征的欧氏距离
4. **阈值判断**：距离小于阈值则验证通过

#### 距离阈值说明：
- **0.4**: 非常严格，可能拒绝本人
- **0.5**: 严格，适合高安全场景
- **0.6**: 标准阈值，平衡安全性和用户体验
- **0.7**: 宽松，可能接受相似人脸

### 4. 特征向量 (Face Descriptor)

#### 什么是Face Descriptor？
- 128维浮点数数组
- 代表人脸的唯一特征
- 不可逆（无法从特征还原人脸）
- 相同人脸的特征向量距离较小

#### 存储格式：
```javascript
// Float32Array 转为普通数组存储到JSON
const descriptor = Array.from(detection.descriptor)

// 从数据库读取后转回Float32Array
const storedDescriptor = new Float32Array(data.face_descriptor)
```

### 5. 优化建议

#### 性能优化：
1. **使用TinyFaceDetector**：比SSD Mobilenet快但精度略低
2. **调整输入尺寸**：降低视频分辨率可提高速度
3. **批处理**：同时处理多个人脸
4. **Web Worker**：将计算移到后台线程

#### 用户体验优化：
1. **实时反馈**：显示人脸框和特征点
2. **质量提示**：提醒用户调整光线、角度
3. **进度显示**：显示采集进度
4. **错误处理**：友好的错误提示

### 6. 常见问题

#### Q: 为什么摄像头启动了但画面不显示？
A: 可能原因：
- Video元素的display属性设置为none
- 视频流未正确绑定到video元素
- 浏览器安全策略要求用户交互

#### Q: 第一次采集需要几张照片？
A: 建议3-5张，从不同角度采集可提高识别准确率

#### Q: 如何提高识别准确率？
A: 
- 确保良好的光线条件
- 正面面对摄像头
- 移除眼镜、口罩等遮挡物
- 采集多个样本求平均

### 7. 安全考虑

1. **活体检测**：防止照片欺骗
2. **加密存储**：特征向量应加密存储
3. **访问控制**：限制特征数据访问权限
4. **定期更新**：定期更新用户特征数据

### 8. 实现示例

```javascript
// 完整的人脸注册流程
async function enrollUser(userId, videoElement) {
  const samples = []
  const requiredSamples = 3
  
  // 采集多个样本
  for (let i = 0; i < requiredSamples; i++) {
    // 提示用户
    showMessage(`请保持面部在框内 (${i + 1}/${requiredSamples})`)
    
    // 检测人脸
    const detection = await detectFace(videoElement)
    if (!detection) {
      i-- // 重试
      continue
    }
    
    samples.push(detection.descriptor)
    await sleep(1000) // 等待一秒
  }
  
  // 计算平均特征
  const avgDescriptor = averageDescriptors(samples)
  
  // 存储到数据库
  await saveDescriptor(userId, avgDescriptor)
}

// 人脸验证
async function verifyUser(userId, videoElement) {
  // 获取存储的特征
  const storedDescriptor = await getStoredDescriptor(userId)
  
  // 检测当前人脸
  const detection = await detectFace(videoElement)
  if (!detection) {
    throw new Error('未检测到人脸')
  }
  
  // 计算距离
  const distance = faceapi.euclideanDistance(
    storedDescriptor,
    detection.descriptor
  )
  
  // 判断是否匹配
  return distance < 0.6
}
```

## 当前系统的问题和改进建议

### 当前问题：
1. 只采集一次人脸，准确率可能不高
2. 没有实时显示人脸检测框
3. 缺少人脸质量检查
4. 没有活体检测

### 改进方案：
1. 实现多次采集流程
2. 添加人脸检测可视化
3. 实现人脸质量评分
4. 添加简单的活体检测（如眨眼检测）