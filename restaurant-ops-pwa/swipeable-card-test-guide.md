# Swipeable Card Test Guide

## Testing the "最后一位客人离店" Swipeable Card

### How to Test

1. **Access the Manager Dashboard**
   - Open http://localhost:5174 (or the port shown in your terminal)
   - Select "经理 Manager" role

2. **Navigate to Pre-closing Period**
   - Use the time controls to set the time to the pre-closing period
   - Or wait for the natural progression to pre-closing

3. **Test the Swipeable Card**
   - Look for the orange/warning gradient card that says "最后一位客人离店"
   - The card should have:
     - Gradient background (warning colors)
     - Text saying "请向右滑动确认最后一位客人已离店" (Please swipe right to confirm last customer has left)
     - A circular icon with an arrow (→) on the right side

4. **Swipe Interaction**
   - **On Desktop**: Click and drag the card to the right
   - **On Mobile**: Touch and swipe the card to the right
   - As you swipe:
     - The card should move smoothly
     - A green gradient background should reveal behind
     - The arrow icon should rotate
     - "确认离店 ✓" text should appear when swiped past halfway
   - Release to confirm (if swiped far enough) or snap back

5. **Visual Features**
   - Animated swipe hint (3 dots) at the bottom when not interacting
   - Shadow effect when dragging
   - Smooth transitions when releasing
   - Confirmation state shows checkmark and "已确认客人离店"

### Expected Behavior

- **Swipe Threshold**: Need to swipe ~150px to trigger confirmation
- **Max Drag**: Card stops moving after 200px
- **Auto Snap**: If not swiped far enough, card snaps back to start
- **One-time Action**: Once confirmed, cannot be swiped again
- **Triggers Event**: After confirmation, should trigger the `onLastCustomerLeft` callback

### Troubleshooting

If the card doesn't appear:
1. Make sure you're logged in as Manager role
2. Ensure you're in the pre-closing period
3. Check browser console for any errors

If swipe doesn't work:
1. Check if JavaScript is enabled
2. Try both mouse and touch interactions
3. Ensure no other elements are blocking the card