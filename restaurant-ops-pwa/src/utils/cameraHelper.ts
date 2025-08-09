/**
 * Camera Helper Utilities
 * 
 * Provides camera compatibility fixes for Huawei and other multi-camera devices
 * Handles camera selection, constraints optimization, and device-specific workarounds
 * 
 * Created: 2025-08-05
 */

interface CameraDevice {
  deviceId: string
  label: string
  kind: 'videoinput' | 'audioinput' | 'audiooutput'
  isDefault?: boolean
  capabilities?: MediaTrackCapabilities
}

interface CameraConstraints {
  deviceId?: string | { exact: string }
  facingMode?: string | { exact: string; ideal?: string }
  width?: number | { min?: number; ideal?: number; max?: number }
  height?: number | { min?: number; ideal?: number; max?: number }
  aspectRatio?: number | { exact?: number; ideal?: number }
  zoom?: number | { min?: number; ideal?: number; max?: number }
}

/**
 * Detects if the current device is a Huawei device
 */
export function isHuaweiDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('huawei') || 
         ua.includes('honor') || 
         ua.includes('hms') ||
         // Check for Huawei-specific browser features
         ua.includes('hbrowser')
}

/**
 * Detects if the device is a Huawei Mate 30 series
 */
export function isHuaweiMate30(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('lio-') || // Mate 30
         ua.includes('tn-') ||  // Mate 30 Pro
         ua.includes('tas-')    // Mate 30 RS
}

/**
 * Gets all available camera devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  try {
    // First request camera permission to ensure devices are available
    await navigator.mediaDevices.getUserMedia({ video: true })
    
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
        kind: device.kind as 'videoinput'
      }))
    
    // Try to identify the main camera (usually the first rear camera)
    if (cameras.length > 1) {
      // On Huawei devices with multiple cameras, the main camera is usually not the first
      if (isHuaweiDevice()) {
        // Try to identify by label patterns
        const mainCamera = cameras.find(cam => 
          cam.label.toLowerCase().includes('back') ||
          cam.label.toLowerCase().includes('rear') ||
          cam.label.includes('0') // Often camera 0 is the main camera
        )
        
        if (mainCamera) {
          mainCamera.isDefault = true
        } else if (cameras.length >= 2) {
          // If we can't identify, use the second camera (often the main on Huawei)
          cameras[1].isDefault = true
        }
      } else {
        // For other devices, the first camera is usually the main rear camera
        cameras[0].isDefault = true
      }
    }
    
    return cameras
  } catch (error) {
    console.error('Failed to enumerate camera devices:', error)
    return []
  }
}

/**
 * Gets the capabilities of a specific camera
 */
export async function getCameraCapabilities(deviceId: string): Promise<MediaTrackCapabilities | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    })
    
    const track = stream.getVideoTracks()[0]
    const capabilities = track.getCapabilities ? track.getCapabilities() : null
    
    // Clean up
    track.stop()
    
    return capabilities
  } catch (error) {
    console.error('Failed to get camera capabilities:', error)
    return null
  }
}

/**
 * Gets optimized camera constraints for the current device
 */
export async function getOptimizedConstraints(preferredDeviceId?: string): Promise<MediaStreamConstraints> {
  const baseConstraints: CameraConstraints = {
    facingMode: 'environment'
  }
  
  // For Huawei devices, use specific constraints
  if (isHuaweiDevice()) {
    // Use standard resolutions that work well on Huawei devices
    baseConstraints.width = { ideal: 1280, max: 1920 }
    baseConstraints.height = { ideal: 720, max: 1080 }
    
    // Set aspect ratio to maintain proper framing
    baseConstraints.aspectRatio = { ideal: 16/9 }
    
    // For Mate 30 specifically, add zoom constraints
    if (isHuaweiMate30()) {
      // Start with zoom at 1 to avoid telephoto lens default
      baseConstraints.zoom = { ideal: 1, min: 1, max: 3 }
    }
    
    // If we have a preferred device ID, use it
    if (preferredDeviceId) {
      baseConstraints.deviceId = { exact: preferredDeviceId }
    } else {
      // Try to get the main camera
      const cameras = await getCameraDevices()
      const mainCamera = cameras.find(cam => cam.isDefault) || cameras[1] || cameras[0]
      
      if (mainCamera) {
        baseConstraints.deviceId = { exact: mainCamera.deviceId }
      }
    }
  } else {
    // For non-Huawei devices, use standard constraints
    baseConstraints.width = { ideal: 1920, max: 2560 }
    baseConstraints.height = { ideal: 1080, max: 1440 }
    
    if (preferredDeviceId) {
      baseConstraints.deviceId = { exact: preferredDeviceId }
    }
  }
  
  return { 
    video: baseConstraints,
    audio: false 
  }
}

/**
 * Applies zoom to a media stream if supported
 */
export async function applyZoom(stream: MediaStream, zoomLevel: number): Promise<boolean> {
  try {
    const track = stream.getVideoTracks()[0]
    
    if (!track) {
      console.warn('No video track found')
      return false
    }
    
    // Check if zoom is supported
    const capabilities = track.getCapabilities ? track.getCapabilities() : null
    
    if (capabilities && 'zoom' in capabilities) {
      const constraints = track.getConstraints()
      
      // Apply zoom within the supported range
      const minZoom = (capabilities.zoom as any)?.min || 1
      const maxZoom = (capabilities.zoom as any)?.max || 1
      const targetZoom = Math.max(minZoom, Math.min(zoomLevel, maxZoom))
      
      await track.applyConstraints({
        ...constraints,
        zoom: targetZoom
      })
      
      console.log(`Zoom applied: ${targetZoom}x (range: ${minZoom}-${maxZoom})`)
      return true
    } else {
      console.warn('Zoom is not supported on this device')
      return false
    }
  } catch (error) {
    console.error('Failed to apply zoom:', error)
    return false
  }
}

/**
 * Gets a user-friendly camera label
 */
export function getCameraLabel(device: CameraDevice, index: number): string {
  if (device.label) {
    // Clean up the label
    const label = device.label
      .replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '') // Remove USB IDs
      .replace(/^USB\s+/i, '') // Remove USB prefix
      .trim()
    
    if (label) return label
  }
  
  // Fallback labels
  if (index === 0) return '主摄像头'
  if (index === 1) return '前置摄像头'
  return `摄像头 ${index + 1}`
}

/**
 * Handles camera initialization with fallbacks
 */
export async function initializeCamera(
  videoElement: HTMLVideoElement,
  preferredDeviceId?: string
): Promise<MediaStream | null> {
  try {
    // Stop any existing stream
    if (videoElement.srcObject) {
      const oldStream = videoElement.srcObject as MediaStream
      oldStream.getTracks().forEach(track => track.stop())
    }
    
    // Get optimized constraints
    const constraints = await getOptimizedConstraints(preferredDeviceId)
    
    console.log('Initializing camera with constraints:', constraints)
    
    // Try to get the stream with optimized constraints
    let stream: MediaStream | null = null
    
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (firstError) {
      console.warn('Failed with optimized constraints, trying fallback:', firstError)
      
      // Fallback to basic constraints
      const fallbackConstraints = {
        video: {
          facingMode: 'environment'
        },
        audio: false
      }
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
      } catch (secondError) {
        console.warn('Failed with fallback constraints, trying any camera:', secondError)
        
        // Last resort: any camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
    }
    
    if (stream) {
      videoElement.srcObject = stream
      
      // Wait for metadata to load
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().then(resolve).catch(console.error)
        }
      })
      
      // Apply initial zoom for Huawei Mate 30
      if (isHuaweiMate30()) {
        setTimeout(() => {
          applyZoom(stream, 1) // Reset zoom to 1x
        }, 500)
      }
      
      return stream
    }
    
    return null
  } catch (error) {
    console.error('Failed to initialize camera:', error)
    return null
  }
}

/**
 * Gets device info for debugging
 */
export function getDeviceInfo(): { [key: string]: any } {
  return {
    userAgent: navigator.userAgent,
    isHuawei: isHuaweiDevice(),
    isHuaweiMate30: isHuaweiMate30(),
    platform: navigator.platform,
    vendor: navigator.vendor,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    devicePixelRatio: window.devicePixelRatio,
    mediaDevicesSupported: 'mediaDevices' in navigator,
    getUserMediaSupported: 'getUserMedia' in navigator.mediaDevices,
    enumerateDevicesSupported: 'enumerateDevices' in navigator.mediaDevices
  }
}