# Random Inspection Feature Implementation

## Date: 2025-09-13
## Author: Claude

## Feature Overview
Added support for random table inspection tasks that automatically select a zone and table for inspection.

## Implementation Details

### TaskSubmissionDialog.tsx Updates
When a task has `isRandomInspection: true`, the system:

1. **Randomly selects a zone**:
   - Available zones: 'A区', 'B区', 'C区'
   - Selected using `Math.random()` for true randomization

2. **Randomly selects a table within the zone**:
   ```typescript
   const tables: { [key: string]: string[] } = {
     'A区': ['A1', 'A2'],
     'B区': ['B1', 'B2'],
     'C区': ['C1', 'C2']
   }
   ```
   - Each zone has 2 tables
   - Table is randomly selected from the zone's available tables

3. **Passes selection to PhotoSubmissionDialog**:
   - `isRandomInspection`: Boolean flag
   - `selectedZone`: The randomly selected zone
   - `selectedTable`: The randomly selected table within that zone

4. **Metadata Storage**:
   When submitting, the zone and table info is added to metadata:
   ```typescript
   metadata: {
     selected_zone: selectedZone,
     selected_table: selectedTable,
     inspection_type: 'random',
     inspection_date: new Date().toISOString()
   }
   ```

## Use Case
This feature is designed for quality control inspections where:
- Staff need to inspect random areas without bias
- Management wants unpredictable inspection patterns
- Documentation needs to track which specific table was inspected

## Files Modified
- `/components/TaskSubmissionDialog/TaskSubmissionDialog.tsx` - Lines 69-101, 371-385

## Future Enhancements
- Could expand table mappings for larger restaurants
- Could add weighted randomization based on traffic patterns
- Could track inspection history to ensure coverage over time