# Task Card Swipe Functionality Test Guide

## What Was Fixed

### 1. **Embla Carousel Configuration**
- Changed `dragThreshold` from 10 to 5 for more responsive swiping
- Added `slidesToScroll: 1` for single slide navigation
- Added `watchSlides` and `watchResize` for better responsiveness
- Kept `dragFree: true` and `containScroll: false` for unrestricted swiping

### 2. **CSS Layout Improvements**
- Changed slide width from `100%` to `85%` to show partial next slide
- Updated `touchAction` from `'pan-y pinch-zoom'` to just `'pan-y'` to allow horizontal swiping
- Added `willChange: 'transform'` for performance optimization
- Added proper spacing between slides with `paddingRight: '16px'`

### 3. **Visual Improvements**
- Added swipe hint text "左右滑动查看更多任务 →" when multiple tasks exist
- Improved dot indicators with size changes for selected state
- Better hover effects on dots
- Added cursor styles (grab/grabbing) for desktop

### 4. **Global CSS Support**
- Added Embla-specific CSS classes in index.css
- Ensured smooth scrolling on iOS with `-webkit-overflow-scrolling: touch`
- Prevented text selection and tap highlights during swipe

## How to Test

1. **Open the app** at http://localhost:5174/
2. **Select a role** (Manager or Chef)
3. **Navigate to a period with multiple tasks**

### Test Cases:

#### 1. Basic Swipe Test
- Touch/click and drag left or right on a task card
- Should smoothly scroll between tasks
- Should see partial view of next/previous cards

#### 2. Free Dragging Test
- Swipe quickly and release
- Card should continue scrolling with momentum
- Should be able to stop at any position, not just snapped

#### 3. Dot Navigation Test
- Click on any dot below the cards
- Should smoothly scroll to that specific task
- Selected dot should be larger

#### 4. Edge Case Tests
- Try swiping past the first/last card
- Should stop naturally without bouncing
- Try rapid swiping back and forth

#### 5. Responsiveness Test
- Resize browser window
- Cards should adapt to new size
- Swipe should still work smoothly

## Expected Behavior

✅ **Working Correctly If:**
- Can swipe freely between all tasks
- See 85% of current card + 15% of next card
- Smooth, natural swipe gestures work
- Can swipe at any time without restrictions
- Dots update to show current position
- Completed tasks show with green borders/dots

❌ **Still Broken If:**
- Cards snap back to original position
- Can't swipe past certain cards
- Swipe feels "stuck" or restricted
- Only see one card at a time (100% width)
- Touch/mouse drag doesn't move cards

## Debug Commands

If issues persist, check console for errors:
```javascript
// In browser console
document.querySelector('.embla__container').style
// Should show: display: flex, touch-action: pan-y

// Check if Embla is initialized
window.emblaApi = document.querySelector('[data-embla]')?.__embla
console.log(window.emblaApi?.slideNodes().length) // Should show number of tasks
```