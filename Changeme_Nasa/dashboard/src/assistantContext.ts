import { createContext, useContext, useEffect, useId } from 'react'
import { useLocation } from 'react-router-dom'
import type { ChatContext } from '../../../supabase/functions/chart-assistant/chatContract'

export const AssistantContext = createContext<{
  register: (id: string, location: string, values: ChatContext) => () => void
} | null>(null)

export function useAssistantContext(values: ChatContext) {
  const context = useContext(AssistantContext)
  const { key } = useLocation()
  const id = useId()
  const snapshot = JSON.stringify(values)
  useEffect(() => context?.register(id, key, JSON.parse(snapshot)), [context, id, key, snapshot])
}
