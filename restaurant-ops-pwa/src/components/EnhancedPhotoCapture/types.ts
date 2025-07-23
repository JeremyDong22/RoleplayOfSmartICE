// Enhanced Photo Capture component type definitions
// Changes made:
// 1. Added types for sample selection and photo management
// 2. Support for temporary photo storage with sample association
// 3. Types for batch submission

export interface Sample {
  id: string
  images: string[]
  text: string
}

export interface CapturedPhoto {
  id: string
  photoData: string
  sampleId: string
  sampleName: string
  timestamp: number
  description?: string
}

export interface PhotoSession {
  taskId: string
  taskName: string
  photos: CapturedPhoto[]
  startTime: number
  lastModified: number
}

export interface EnhancedPhotoCaptureProps {
  open: boolean
  taskName: string
  taskId: string
  isFloatingTask?: boolean
  onClose: () => void
  onSubmit: (photos: CapturedPhoto[]) => void
  onSave?: (session: PhotoSession) => void
  existingSession?: PhotoSession
}

export interface SampleSelectorProps {
  samples: Sample[]
  currentSampleId: string
  onSampleChange: (sampleId: string) => void
  capturedPhotos: CapturedPhoto[]
}

export interface PhotoManagementDrawerProps {
  open: boolean
  photos: CapturedPhoto[]
  samples: Sample[]
  onClose: () => void
  onDeletePhoto: (photoId: string) => void
  onRetakePhoto: (photoId: string) => void
  onSubmitAll: () => void
}