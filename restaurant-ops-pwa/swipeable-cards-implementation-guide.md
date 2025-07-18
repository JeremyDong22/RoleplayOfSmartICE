# Swipeable Cards Implementation Guide

## Overview
Based on the research, **Embla Carousel** is the recommended solution for implementing smooth swipeable task cards. This guide provides step-by-step instructions for replacing the current implementation.

## Why Embla Carousel?
- **Lightweight**: Only ~25KB vs current manual implementation complexity
- **Native Performance**: Hardware-accelerated scrolling with built-in momentum
- **Mobile-First**: Excellent touch gesture support out of the box
- **Simple API**: Easy to implement and maintain
- **No Dependencies**: Works standalone, reducing potential conflicts

## Implementation Steps

### 1. Install Embla Carousel
```bash
cd restaurant-ops-pwa
npm install embla-carousel-react
```

### 2. Replace Current Implementation

#### Option A: Direct Replacement
1. Backup the current `TaskCountdown.tsx` file
2. Replace with the new `TaskCountdown-embla.tsx` implementation
3. Update imports in parent components

#### Option B: Gradual Migration
1. Keep both implementations temporarily
2. Add a feature flag to switch between them
3. Test thoroughly before removing old implementation

### 3. Key Changes from Current Implementation

#### Before (Manual Implementation):
```tsx
// Complex manual swipe handling
const [swipeStartX, setSwipeStartX] = useState(0)
const [swipeCurrentX, setSwipeCurrentX] = useState(0)
const [isSwiping, setIsSwiping] = useState(false)

// Manual transform calculations
transform: (() => {
  const baseTransform = -activeTaskIndex * 100
  let swipeOffset = 0
  // ... complex offset calculations
  return `translateX(${baseTransform + swipeOffset}%)`
})()
```

#### After (Embla Carousel):
```tsx
// Simple hook-based API
const [emblaRef, emblaApi] = useEmblaCarousel({
  loop: false,
  align: 'start',
  containScroll: 'trimSnaps'
})

// Automatic gesture handling and animations
```

### 4. Benefits of New Implementation

1. **Smoother Animations**: Native momentum scrolling feels more natural
2. **Better Touch Handling**: Embla handles edge cases automatically
3. **Reduced Code Complexity**: ~50% less code for swipe logic
4. **Improved Maintainability**: Well-documented API with TypeScript support
5. **Performance**: Hardware acceleration without manual calculations

### 5. Testing Checklist

- [ ] Swipe left/right gestures work smoothly
- [ ] Cards snap to position correctly
- [ ] First/last card boundaries prevent over-scrolling
- [ ] Dot indicators update correctly
- [ ] Clicking dots navigates to correct card
- [ ] Completed tasks show visual feedback
- [ ] Performance is smooth on older devices
- [ ] Works on both iOS and Android
- [ ] Desktop mouse drag works as expected

### 6. Customization Options

#### Adjust Swipe Sensitivity:
```tsx
const [emblaRef, emblaApi] = useEmblaCarousel({
  dragFree: false, // Snap to slides
  speed: 10, // Transition speed (default: 10)
  skipSnaps: false // Allow skipping slides quickly
})
```

#### Add Auto-play (if needed):
```tsx
import Autoplay from 'embla-carousel-autoplay'

const [emblaRef] = useEmblaCarousel(
  { loop: true },
  [Autoplay({ delay: 3000 })]
)
```

#### Custom Animations:
```tsx
// Add scale effect for active card
transform: isCurrentSlide ? 'scale(1)' : 'scale(0.95)',
opacity: isCompleted ? 0.7 : 1
```

### 7. Fallback Plan

If Embla Carousel doesn't meet all requirements, consider:

1. **Framer Motion**: More control over animations but larger bundle
2. **Swiper.js**: Most features but moving away from React components
3. **Improved Manual Implementation**: Fix current bugs with better boundary detection

### 8. Migration Timeline

1. **Day 1**: Install and create test implementation
2. **Day 2-3**: Test on various devices and browsers
3. **Day 4**: Deploy to staging environment
4. **Day 5**: Gather user feedback
5. **Day 6-7**: Make adjustments and deploy to production

## Conclusion

Embla Carousel provides the best solution for the swipeable task cards requirement. It solves all current issues while being lightweight and easy to maintain. The implementation is straightforward and will significantly improve the user experience on mobile devices.