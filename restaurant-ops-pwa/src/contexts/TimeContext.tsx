// Time context for testing - allows overriding current time
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface TimeContextType {
  currentTime: Date
  isTestMode: boolean
  setTestTime: (date: Date) => void
  resetToRealTime: () => void
}

const TimeContext = createContext<TimeContextType | undefined>(undefined)

export const useTime = () => {
  const context = useContext(TimeContext)
  if (!context) {
    throw new Error('useTime must be used within a TimeProvider')
  }
  return context
}

interface TimeProviderProps {
  children: ReactNode
}

export const TimeProvider: React.FC<TimeProviderProps> = ({ children }) => {
  const [testTime, setTestTime] = useState<Date | null>(null)
  const [isTestMode, setIsTestMode] = useState(false)

  const currentTime = isTestMode && testTime ? testTime : new Date()

  const setTestTimeHandler = (date: Date) => {
    setTestTime(date)
    setIsTestMode(true)
  }

  const resetToRealTime = () => {
    setTestTime(null)
    setIsTestMode(false)
  }

  return (
    <TimeContext.Provider
      value={{
        currentTime,
        isTestMode,
        setTestTime: setTestTimeHandler,
        resetToRealTime
      }}
    >
      {children}
    </TimeContext.Provider>
  )
}