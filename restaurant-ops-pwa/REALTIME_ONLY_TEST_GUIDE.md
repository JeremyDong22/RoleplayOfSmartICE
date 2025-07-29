# Supabase Realtime Only - Test Guide

## Overview
This test guide helps verify that the system now uses ONLY Supabase Realtime for cross-device communication, with BroadcastChannel and localStorage fallback mechanisms removed.

## Changes Made
1. **broadcastService.ts**: Converted to no-op dummy service
2. **ManagerDashboard**: Removed all broadcastService.send() calls
3. **ChefDashboard**: Removed all broadcastService.subscribe() calls
4. **realtimeDutyService**: Removed localStorage fallback mechanism
5. **EditableTime**: Removed broadcastService usage for clearing storage

## Test Scenarios

### Scenario 1: Manager Triggers Duty Manager Tasks (Lunch)
1. Open two browser windows/tabs
2. Window 1: Login as **前厅经理** (Manager)
3. Window 2: Login as **值班经理** (Duty Manager)
4. Set time to **13:30** (during lunch period)
5. In Manager window: Swipe right when "最后一桌客人离开" card appears
6. **Expected**: Duty Manager window should receive two tasks:
   - 能源管理（空调、照明系统）
   - 备用金管理（午市备用金清点）

### Scenario 2: Manager Triggers Duty Manager Tasks (Dinner)
1. Keep both windows open
2. Set time to **21:30** (pre-closing period)
3. In Manager window: Swipe right when "最后一桌客人离开" card appears
4. **Expected**: Duty Manager window should receive two tasks:
   - 能源安全检查（设备关闭、燃气阀门、总电源）
   - 备用金管理（晚市备用金清点）

### Scenario 3: Cross-Device Communication
1. Open Manager on Device A (e.g., laptop)
2. Open Duty Manager on Device B (e.g., phone/tablet)
3. Repeat Scenario 1 or 2
4. **Expected**: Tasks should appear on Device B when triggered from Device A

### Scenario 4: Network Disruption Test
1. Setup as in Scenario 1
2. Disconnect network briefly (1-2 seconds)
3. Reconnect network
4. Trigger tasks from Manager
5. **Expected**: 
   - System should reconnect automatically
   - Tasks should be delivered after reconnection
   - NO localStorage fallback messages should appear

### Scenario 5: Review Task Flow
1. After Duty Manager completes a task with photo
2. In Manager window: Check if review tasks appear
3. Manager approves/rejects the submission
4. **Expected**: Duty Manager should see real-time status updates

## Console Checks
Open browser console (F12) and verify:

1. **No BroadcastChannel messages**: Should see "[BroadcastService] Deprecated: Use Supabase Realtime for communication"
2. **Supabase Realtime status**: Should see "[RealtimeDutyService] ✓ Connected to Supabase Realtime"
3. **No localStorage polling**: Should NOT see any localStorage fallback messages
4. **Connection errors**: If network is down, should see proper error messages without fallback attempts

## Known Limitations
- If Supabase Realtime is unavailable, the system will NOT fall back to localStorage
- All cross-tab/cross-device communication requires active internet connection
- Connection failures will result in error messages rather than silent fallback

## Test Checklist
- [ ] BroadcastService shows deprecation message
- [ ] Manager can trigger tasks successfully
- [ ] Duty Manager receives tasks in real-time
- [ ] Cross-device communication works
- [ ] No localStorage fallback occurs
- [ ] Reconnection after network disruption works
- [ ] Review workflow functions properly
- [ ] Console shows only Supabase Realtime messages

## Rollback Instructions
If issues occur and you need to restore the original multi-layer communication:
1. Revert changes in:
   - src/services/broadcastService.ts
   - src/services/realtimeDutyService.ts
   - src/pages/ManagerDashboard-new.tsx
   - src/pages/ChefDashboard-new.tsx
   - src/components/TimeControl/EditableTime.tsx