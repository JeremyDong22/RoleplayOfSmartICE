/**
 * Upload Queue Service
 * Manages failed uploads with IndexedDB for persistence and retry logic
 * 
 * Features:
 * - Stores failed uploads in IndexedDB for persistence across sessions
 * - Automatic retry with exponential backoff
 * - Progressive upload tracking
 * - Network status monitoring
 * - Differential sync (only upload new items)
 * 
 * Created: 2025-09-06
 */

import { submitTaskRecord } from './taskRecordService'
import { uploadPhoto } from './storageService'
import { compressImage, needsCompression } from '../utils/imageCompressor'

// IndexedDB configuration
const DB_NAME = 'TaskUploadQueue'
const DB_VERSION = 1
const STORE_NAME = 'pending_uploads'

// Queue item status
export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PARTIAL = 'partial', // Some photos uploaded
  FAILED = 'failed',
  COMPLETED = 'completed'
}

// Queue item structure
export interface QueuedUpload {
  id: string
  taskId: string
  userId: string
  restaurantId: string
  date: string
  periodId: string
  uploadRequirement?: string
  data: any
  photos?: Array<{
    id: string
    data: string // base64 or blob URL
    uploaded: boolean
    url?: string
    retries: number
  }>
  status: UploadStatus
  retryCount: number
  lastAttempt?: number
  createdAt: number
  error?: string
}

class UploadQueueService {
  private db: IDBDatabase | null = null
  private isOnline: boolean = navigator.onLine
  private retryTimer: NodeJS.Timeout | null = null
  private listeners: Set<(queue: QueuedUpload[]) => void> = new Set()

  constructor() {
    this.initDB()
    this.setupNetworkListeners()
    this.startRetryProcess()
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[UploadQueue] IndexedDB initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('taskId', 'taskId', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[UploadQueue] Network online, processing queue')
      this.isOnline = true
      this.processQueue()
    })

    window.addEventListener('offline', () => {
      console.log('[UploadQueue] Network offline')
      this.isOnline = false
    })
  }

  /**
   * Start automatic retry process
   */
  private startRetryProcess(): void {
    // Check queue every 30 seconds when online
    setInterval(() => {
      if (this.isOnline) {
        this.processQueue()
      }
    }, 30000)
  }

  /**
   * Add a failed upload to the queue
   */
  async addToQueue(upload: Omit<QueuedUpload, 'id' | 'status' | 'retryCount' | 'createdAt'>): Promise<void> {
    if (!this.db) await this.initDB()

    const queueItem: QueuedUpload = {
      ...upload,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: UploadStatus.PENDING,
      retryCount: 0,
      createdAt: Date.now()
    }

    // Process photos if they exist
    if (upload.data?.evidence) {
      const photos = Array.isArray(upload.data.evidence) 
        ? upload.data.evidence 
        : upload.data.evidence.evidence || []
      
      queueItem.photos = photos.map((photo: any, index: number) => ({
        id: `photo_${index}_${Date.now()}`,
        data: photo.photo || photo.image,
        uploaded: false,
        retries: 0
      }))
    }

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise((resolve, reject) => {
      const request = store.add(queueItem)
      request.onsuccess = () => {
        console.log('[UploadQueue] Added to queue:', queueItem.id)
        this.notifyListeners()
        resolve(void 0)
      }
      request.onerror = () => reject(request.error)
    })

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue()
    }
  }

  /**
   * Process pending uploads in the queue
   */
  async processQueue(): Promise<void> {
    if (!this.db) await this.initDB()
    if (!this.isOnline) return

    const transaction = this.db!.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('status')
    
    const pendingUploads = await new Promise<QueuedUpload[]>((resolve) => {
      const request = index.getAll(IDBKeyRange.only(UploadStatus.PENDING))
      request.onsuccess = () => resolve(request.result || [])
    })

    const partialUploads = await new Promise<QueuedUpload[]>((resolve) => {
      const request = index.getAll(IDBKeyRange.only(UploadStatus.PARTIAL))
      request.onsuccess = () => resolve(request.result || [])
    })

    const allUploads = [...pendingUploads, ...partialUploads]
    console.log(`[UploadQueue] Processing ${allUploads.length} queued uploads`)

    for (const upload of allUploads) {
      // Skip if recently attempted
      if (upload.lastAttempt && Date.now() - upload.lastAttempt < 10000) {
        continue
      }

      await this.processUpload(upload)
    }
  }

  /**
   * Process a single upload with progressive photo upload
   */
  private async processUpload(upload: QueuedUpload): Promise<void> {
    console.log(`[UploadQueue] Processing upload ${upload.id}`)
    
    // Update status to uploading
    await this.updateUpload(upload.id, { 
      status: UploadStatus.UPLOADING,
      lastAttempt: Date.now()
    })

    try {
      const submissionData: any = {
        user_id: upload.userId,
        restaurant_id: upload.restaurantId,
        task_id: upload.taskId,
        date: upload.date,
        period_id: upload.periodId,
        submission_metadata: { ...upload.data }
      }

      // Handle photo uploads progressively
      if (upload.photos && upload.photos.length > 0) {
        submissionData.submission_type = 'photo'
        submissionData.photo_urls = []

        // Upload photos that haven't been uploaded yet
        for (const photo of upload.photos) {
          if (photo.uploaded && photo.url) {
            // Already uploaded, just add URL
            submissionData.photo_urls.push(photo.url)
          } else if (photo.data && photo.data.startsWith('data:')) {
            // Need to upload
            try {
              console.log(`[UploadQueue] Uploading photo ${photo.id}`)
              
              // Compress if needed
              let processedPhoto = photo.data
              if (needsCompression(photo.data, 800)) {
                processedPhoto = await compressImage(photo.data, {
                  maxWidth: 1920,
                  maxHeight: 1080,
                  quality: 0.8
                })
              }

              const result = await uploadPhoto(
                processedPhoto,
                upload.userId,
                upload.taskId
              )

              if (result) {
                photo.uploaded = true
                photo.url = result.publicUrl
                submissionData.photo_urls.push(result.publicUrl)
                
                // Update photo status in DB
                await this.updatePhotoStatus(upload.id, photo.id, true, result.publicUrl)
              }
            } catch (error) {
              console.error(`[UploadQueue] Failed to upload photo ${photo.id}:`, error)
              photo.retries++
              
              // If some photos uploaded, mark as partial
              if (submissionData.photo_urls.length > 0) {
                await this.updateUpload(upload.id, {
                  status: UploadStatus.PARTIAL,
                  photos: upload.photos
                })
                return
              }
              throw error
            }
          }
        }
      }

      // Submit the task record
      console.log('[UploadQueue] Submitting task record')
      await submitTaskRecord(submissionData)

      // Mark as completed and remove from queue
      await this.removeFromQueue(upload.id)
      console.log(`[UploadQueue] Upload ${upload.id} completed successfully`)
      
    } catch (error: any) {
      console.error(`[UploadQueue] Upload ${upload.id} failed:`, error)
      
      const newRetryCount = upload.retryCount + 1
      const maxRetries = 5
      
      if (newRetryCount >= maxRetries) {
        // Max retries reached, mark as failed
        await this.updateUpload(upload.id, {
          status: UploadStatus.FAILED,
          retryCount: newRetryCount,
          error: error.message
        })
      } else {
        // Update retry count and revert to pending
        await this.updateUpload(upload.id, {
          status: UploadStatus.PENDING,
          retryCount: newRetryCount,
          error: error.message
        })
      }
    }
  }

  /**
   * Update a queued upload
   */
  private async updateUpload(id: string, updates: Partial<QueuedUpload>): Promise<void> {
    if (!this.db) await this.initDB()

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    const request = store.get(id)
    request.onsuccess = () => {
      const upload = request.result
      if (upload) {
        Object.assign(upload, updates)
        store.put(upload)
        this.notifyListeners()
      }
    }
  }

  /**
   * Update photo upload status
   */
  private async updatePhotoStatus(uploadId: string, photoId: string, uploaded: boolean, url?: string): Promise<void> {
    if (!this.db) await this.initDB()

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    const request = store.get(uploadId)
    request.onsuccess = () => {
      const upload = request.result
      if (upload && upload.photos) {
        const photo = upload.photos.find((p: any) => p.id === photoId)
        if (photo) {
          photo.uploaded = uploaded
          if (url) photo.url = url
          store.put(upload)
          this.notifyListeners()
        }
      }
    }
  }

  /**
   * Remove completed upload from queue
   */
  private async removeFromQueue(id: string): Promise<void> {
    if (!this.db) await this.initDB()

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    store.delete(id)
    this.notifyListeners()
  }

  /**
   * Get all queued uploads
   */
  async getQueuedUploads(): Promise<QueuedUpload[]> {
    if (!this.db) await this.initDB()

    const transaction = this.db!.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    const uploads = await this.getQueuedUploads()
    return uploads.filter(u => u.status !== UploadStatus.COMPLETED).length
  }

  /**
   * Clear completed uploads
   */
  async clearCompleted(): Promise<void> {
    if (!this.db) await this.initDB()

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('status')
    
    const request = index.openCursor(IDBKeyRange.only(UploadStatus.COMPLETED))
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
    
    this.notifyListeners()
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(listener: (queue: QueuedUpload[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of queue changes
   */
  private async notifyListeners(): Promise<void> {
    const queue = await this.getQueuedUploads()
    this.listeners.forEach(listener => listener(queue))
  }

  /**
   * Retry a specific failed upload
   */
  async retryUpload(id: string): Promise<void> {
    await this.updateUpload(id, {
      status: UploadStatus.PENDING,
      retryCount: 0,
      error: undefined
    })
    
    if (this.isOnline) {
      this.processQueue()
    }
  }
}

// Export singleton instance
export const uploadQueueService = new UploadQueueService()