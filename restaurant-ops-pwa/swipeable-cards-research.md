# Swipeable Cards Library Research & Recommendations

## Current Implementation Issues
The current implementation uses manual touch/mouse event handling with transform-based animations, which has several problems:
- Complex boundary detection logic that's prone to bugs
- Manual calculation of swipe offsets and elastic resistance
- Lack of native gesture handling optimizations
- No built-in support for advanced animations or physics-based interactions

## Research Summary

### 1. **Swiper.js** ⭐⭐⭐⭐
**Pros:**
- Most mature and widely adopted solution
- Built-in cards effect mode perfect for one-at-a-time display
- Excellent mobile performance with hardware acceleration
- Rich API with pagination, navigation, and effects
- Active development (v11+ as of 2024)

**Cons:**
- Larger bundle size (~150KB)
- Moving away from React components to Web Components
- May be overkill for simple card swiping

**Best for:** Projects needing a robust, feature-rich solution with minimal custom code

### 2. **Framer Motion** ⭐⭐⭐⭐⭐
**Pros:**
- Excellent gesture handling with drag constraints
- Spring-based physics animations
- Small API surface, easy to learn
- Great TypeScript support
- Can create custom swipe behaviors easily
- Already using Material-UI, so adding Framer Motion is natural

**Cons:**
- Requires more custom implementation than Swiper.js
- Bundle size consideration (~45KB)

**Best for:** Projects wanting fine control over animations and already using modern React patterns

### 3. **react-spring + @use-gesture** ⭐⭐⭐⭐
**Pros:**
- Powerful spring physics animations
- @use-gesture provides excellent touch handling
- Very customizable
- Good performance

**Cons:**
- Steeper learning curve
- Two libraries to manage
- More boilerplate code needed

**Best for:** Advanced use cases requiring complex gesture interactions

### 4. **Embla Carousel** ⭐⭐⭐⭐⭐
**Pros:**
- Lightweight (~25KB)
- Simple API
- Excellent mobile performance
- Built-in momentum scrolling
- Works great with one slide at a time
- No dependencies

**Cons:**
- Less built-in effects than Swiper.js
- Requires CSS setup for styling

**Best for:** Projects prioritizing performance and simplicity

### 5. **react-swipeable** ⭐⭐⭐
**Pros:**
- Very lightweight (~5KB)
- Simple swipe detection
- Easy to integrate

**Cons:**
- Only provides swipe detection, no built-in animations
- Still need to implement card transitions manually

**Best for:** Minimal implementations where you want full control

## Recommendation: Embla Carousel

For this specific use case, **Embla Carousel** is the best choice because:

1. **Perfect fit for requirements:**
   - Native one-at-a-time card display
   - Smooth gesture handling on mobile
   - Built-in pagination support
   - Small bundle size

2. **Easy integration:**
   - Simple React hook API
   - Minimal configuration needed
   - Works well with Material-UI

3. **Performance:**
   - Lightweight and fast
   - Hardware-accelerated scrolling
   - No unnecessary features

## Implementation Plan

### Step 1: Install Embla Carousel
```bash
npm install embla-carousel-react
```

### Step 2: Basic Implementation
```tsx
import useEmblaCarousel from 'embla-carousel-react'

const TaskCarousel = ({ tasks, onComplete }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps'
  })

  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => emblaApi.off('select', onSelect)
  }, [emblaApi, onSelect])

  return (
    <div className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {tasks.map((task, index) => (
            <div className="embla__slide" key={task.id}>
              <TaskCard task={task} onComplete={onComplete} />
            </div>
          ))}
        </div>
      </div>
      <DotIndicators 
        slides={tasks} 
        selectedIndex={selectedIndex}
        onDotClick={(index) => emblaApi?.scrollTo(index)}
      />
    </div>
  )
}
```

### Step 3: CSS Configuration
```css
.embla {
  position: relative;
  width: 100%;
}

.embla__viewport {
  overflow: hidden;
}

.embla__container {
  display: flex;
}

.embla__slide {
  flex: 0 0 100%;
  min-width: 0;
  padding: 0 1rem;
}
```

## Alternative: Framer Motion (If more control needed)

If you need more advanced animations or custom behaviors, Framer Motion would be the second choice:

```tsx
import { motion, AnimatePresence } from 'framer-motion'

const TaskCards = ({ tasks, currentIndex }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentIndex}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          const swipe = Math.abs(offset.x) * velocity.x
          if (swipe < -10000) {
            // Next card
          } else if (swipe > 10000) {
            // Previous card
          }
        }}
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <TaskCard task={tasks[currentIndex]} />
      </motion.div>
    </AnimatePresence>
  )
}
```

## Conclusion

Embla Carousel provides the best balance of simplicity, performance, and features for this use case. It will solve the current erratic movement issues while providing a smooth, native-feeling swipe experience on mobile devices.