// Unified theme for special tasks (特殊任务) styling
// This file defines consistent blue color scheme for all special task UI elements

export const specialTaskTheme = {
  // Primary blue color for borders, chips, and main elements
  primary: '#1976d2',
  
  // Light blue for backgrounds and hover states
  lightBackground: 'rgba(25, 118, 210, 0.08)',
  
  // Medium blue for borders with transparency
  borderColor: 'rgba(25, 118, 210, 0.3)',
  
  // Darker blue for text and icons
  textColor: '#1565c0',
  
  // Chip colors
  chip: {
    background: '#1976d2',
    color: '#ffffff'
  },
  
  // Icon color
  iconColor: '#1976d2',
  
  // Hover state
  hoverBackground: 'rgba(25, 118, 210, 0.12)',
  
  // Completed state (keeping green for completed tasks)
  completed: {
    background: 'rgba(76, 175, 80, 0.08)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    iconColor: '#4caf50'
  }
}