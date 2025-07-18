// Task Pool Manager - Handles task posts and review system
// Created: Implementation of post-based task verification system

export interface TaskPost {
  id: string
  taskId: string
  taskTitle: string
  periodId: string
  department: '前厅' | '后厨'
  uploadedBy: 'manager' | 'chef' | 'front-employee' | 'kitchen-employee' | 'ceo'
  uploadedByName?: string // Optional display name
  uploadedAt: Date
  content: {
    photos?: string[] // base64 encoded images
    videos?: string[] // base64 encoded videos (future support)
    text?: string     // Text description/notes
  }
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: Date
}

export interface TaskPool {
  posts: TaskPost[]
  lastUpdated: Date
}

const TASK_POOL_KEY = 'restaurant-ops-task-pool'

// Generate unique ID for posts
const generatePostId = (): string => {
  return `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Load task pool from localStorage
export const loadTaskPool = (): TaskPool => {
  try {
    const stored = localStorage.getItem(TASK_POOL_KEY)
    if (stored) {
      const pool = JSON.parse(stored)
      // Convert date strings back to Date objects
      pool.posts = pool.posts.map((post: any) => ({
        ...post,
        uploadedAt: new Date(post.uploadedAt),
        reviewedAt: post.reviewedAt ? new Date(post.reviewedAt) : undefined
      }))
      pool.lastUpdated = new Date(pool.lastUpdated)
      return pool
    }
  } catch (error) {
    console.error('Error loading task pool:', error)
  }
  
  return {
    posts: [],
    lastUpdated: new Date()
  }
}

// Save task pool to localStorage
export const saveTaskPool = (pool: TaskPool): void => {
  try {
    pool.lastUpdated = new Date()
    localStorage.setItem(TASK_POOL_KEY, JSON.stringify(pool))
    
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('taskPoolUpdated', { detail: pool }))
  } catch (error) {
    console.error('Error saving task pool:', error)
  }
}

// Add a new post to the task pool
export const addPost = (post: Omit<TaskPost, 'id' | 'uploadedAt' | 'status'>): TaskPost => {
  const pool = loadTaskPool()
  
  const newPost: TaskPost = {
    ...post,
    id: generatePostId(),
    uploadedAt: new Date(),
    status: 'pending'
  }
  
  // Auto-approve posts from managers and chefs
  if (post.uploadedBy === 'manager' || post.uploadedBy === 'chef' || post.uploadedBy === 'ceo') {
    newPost.status = 'approved'
    newPost.reviewedBy = post.uploadedBy
    newPost.reviewedAt = new Date()
  }
  
  pool.posts.push(newPost)
  saveTaskPool(pool)
  
  return newPost
}

// Get posts for a specific task
export const getPostsForTask = (taskId: string, includeRejected = false): TaskPost[] => {
  const pool = loadTaskPool()
  return pool.posts.filter(post => 
    post.taskId === taskId && 
    (includeRejected || post.status !== 'rejected')
  )
}

// Get pending posts for a specific department
export const getPendingPostsForDepartment = (department: '前厅' | '后厨'): TaskPost[] => {
  const pool = loadTaskPool()
  return pool.posts.filter(post => 
    post.department === department && 
    post.status === 'pending'
  )
}

// Get pending posts count for a specific task
export const getPendingCountForTask = (taskId: string): number => {
  const pool = loadTaskPool()
  return pool.posts.filter(post => 
    post.taskId === taskId && 
    post.status === 'pending'
  ).length
}

// Approve a post
export const approvePost = (postId: string, reviewedBy: string): void => {
  const pool = loadTaskPool()
  const post = pool.posts.find(p => p.id === postId)
  
  if (post && post.status === 'pending') {
    post.status = 'approved'
    post.reviewedBy = reviewedBy
    post.reviewedAt = new Date()
    saveTaskPool(pool)
  }
}

// Reject a post
export const rejectPost = (postId: string, reviewedBy: string): void => {
  const pool = loadTaskPool()
  const post = pool.posts.find(p => p.id === postId)
  
  if (post && post.status === 'pending') {
    post.status = 'rejected'
    post.reviewedBy = reviewedBy
    post.reviewedAt = new Date()
    saveTaskPool(pool)
  }
}

// Approve multiple posts at once
export const approveMultiplePosts = (postIds: string[], reviewedBy: string): void => {
  const pool = loadTaskPool()
  const now = new Date()
  
  postIds.forEach(postId => {
    const post = pool.posts.find(p => p.id === postId)
    if (post && post.status === 'pending') {
      post.status = 'approved'
      post.reviewedBy = reviewedBy
      post.reviewedAt = now
    }
  })
  
  saveTaskPool(pool)
}

// Get approved posts for task completion
export const getApprovedPostsForTask = (taskId: string): TaskPost[] => {
  const pool = loadTaskPool()
  return pool.posts.filter(post => 
    post.taskId === taskId && 
    post.status === 'approved'
  )
}

// Clear old posts (optional cleanup function)
export const clearOldPosts = (daysToKeep = 7): void => {
  const pool = loadTaskPool()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  pool.posts = pool.posts.filter(post => 
    post.uploadedAt > cutoffDate
  )
  
  saveTaskPool(pool)
}

// Subscribe to task pool updates
export const subscribeToTaskPoolUpdates = (callback: (pool: TaskPool) => void): () => void => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<TaskPool>
    callback(customEvent.detail)
  }
  
  window.addEventListener('taskPoolUpdated', handler)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener('taskPoolUpdated', handler)
  }
}