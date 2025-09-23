/**
 * Progressive Image Loading Component
 * Version: 1.0
 *
 * A React component that implements progressive image loading with multiple quality levels.
 * Displays a low-quality thumbnail first, then loads higher quality versions as needed.
 *
 * Created: 2025-01-24
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Box, CircularProgress, IconButton } from '@mui/material'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import {
  getProgressiveImageUrls,
  supportsTransformation,
  preloadImage
} from '../../utils/supabaseImageTransform'

interface ProgressiveImageProps {
  src: string
  alt: string
  width?: number | string
  height?: number | string
  onClick?: () => void
  showZoomIcon?: boolean
  className?: string
  style?: React.CSSProperties
  loading?: 'lazy' | 'eager'
  preloadFull?: boolean
}

type LoadingState = 'loading' | 'thumbnail' | 'preview' | 'full' | 'error'

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  width = '100%',
  height = 100,
  onClick,
  showZoomIcon = true,
  className,
  style,
  loading = 'lazy',
  preloadFull = false
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>('loading')
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const [isInViewport, setIsInViewport] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Get progressive URLs
  const urls = getProgressiveImageUrls(src)
  const supportsTransform = supportsTransformation(src)

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!imageRef.current || loading === 'eager') {
      setIsInViewport(true)
      return
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInViewport(true)
          observerRef.current?.disconnect()
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    )

    observerRef.current.observe(imageRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [loading])

  // Load thumbnail immediately when in viewport
  useEffect(() => {
    if (!isInViewport) return

    const loadThumbnail = async () => {
      try {
        await preloadImage(urls.thumbnail)
        setCurrentSrc(urls.thumbnail)
        setLoadingState('thumbnail')

        // Immediately start loading preview
        loadPreview()
      } catch (error) {
        console.error('Failed to load thumbnail:', error)
        // Try loading preview directly on thumbnail failure
        loadPreview()
      }
    }

    const loadPreview = async () => {
      try {
        await preloadImage(urls.preview)
        setCurrentSrc(urls.preview)
        setLoadingState('preview')

        // Preload full image if requested
        if (preloadFull) {
          preloadImage(urls.full).catch(() => {
            // Silently fail preload
          })
        }
      } catch (error) {
        console.error('Failed to load preview:', error)
        setLoadingState('error')
      }
    }

    loadThumbnail()
  }, [isInViewport, urls.thumbnail, urls.preview, urls.full, preloadFull])

  // Load full image when clicked or hovered (optional)
  const handleLoadFull = useCallback(async () => {
    if (loadingState === 'full' || loadingState === 'error') return

    try {
      await preloadImage(urls.full)
      setCurrentSrc(urls.full)
      setLoadingState('full')
    } catch (error) {
      console.error('Failed to load full image:', error)
      setLoadingState('error')
    }
  }, [loadingState, urls.full])

  const handleClick = useCallback(() => {
    if (onClick) {
      // If there's a custom onClick handler, load full image first
      if (loadingState !== 'full' && loadingState !== 'error') {
        handleLoadFull().then(() => {
          onClick()
        })
      } else {
        onClick()
      }
    } else {
      // Default behavior: load full image on click
      handleLoadFull()
    }
  }, [onClick, handleLoadFull, loadingState])

  // For non-transformable images (like base64), show directly
  if (!supportsTransform) {
    return (
      <Box
        ref={imageRef}
        sx={{
          position: 'relative',
          width,
          height,
          overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
          ...style
        }}
        className={className}
        onClick={onClick}
      >
        <img
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          loading={loading}
        />
      </Box>
    )
  }

  return (
    <Box
      ref={imageRef}
      sx={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        cursor: onClick || loadingState !== 'full' ? 'pointer' : 'default',
        backgroundColor: '#f5f5f5',
        ...style
      }}
      className={className}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Loading spinner */}
      {loadingState === 'loading' && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Error state */}
      {loadingState === 'error' && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'text.secondary'
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 40, mb: 1 }} />
          <Box sx={{ fontSize: '0.75rem' }}>加载失败</Box>
        </Box>
      )}

      {/* Progressive image */}
      {currentSrc && loadingState !== 'error' && (
        <Box
          component="img"
          src={currentSrc}
          alt={alt}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: loadingState === 'thumbnail' ? 'blur(10px)' : 'none',
            transform: loadingState === 'thumbnail' ? 'scale(1.1)' : 'scale(1)',
            transition: 'filter 0.3s ease-out, transform 0.3s ease-out'
          }}
        />
      )}

      {/* Quality indicator */}
      {loadingState !== 'error' && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            fontSize: '0.625rem',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '2px 6px',
            borderRadius: '4px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s',
            pointerEvents: 'none'
          }}
        >
          {loadingState === 'thumbnail' && '低质量'}
          {loadingState === 'preview' && '预览'}
          {loadingState === 'full' && '高清'}
        </Box>
      )}

      {/* Zoom icon for non-full images */}
      {showZoomIcon && loadingState === 'preview' && (
        <IconButton
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s',
            pointerEvents: isHovered ? 'auto' : 'none',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }
          }}
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            handleClick()
          }}
        >
          <ZoomInIcon />
        </IconButton>
      )}

      {/* Loading progress bar */}
      {(loadingState === 'thumbnail' || loadingState === 'preview') && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.1)'
          }}
        >
          <Box
            sx={{
              height: '100%',
              backgroundColor: 'primary.main',
              width: loadingState === 'thumbnail' ? '33%' : '66%',
              transition: 'width 0.3s ease-out'
            }}
          />
        </Box>
      )}
    </Box>
  )
}

export default ProgressiveImage