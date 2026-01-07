import { create } from 'zustand'
import type { IpcError } from '../../../../../../shared/errors'
import type { MappedError } from '../../../lib/mapIpcError'
import { mapIpcError } from '../../../lib/mapIpcError'

/** Represents an active error in the dashboard */
export interface DashboardError {
  id: string
  mappedError: MappedError
  timestamp: number
  dismissed: boolean
}

interface DashboardErrorState {
  /** Currently active system-level error (shown in error bar) */
  systemError: DashboardError | null
  /** Map of provider errors by provider ID */
  providerErrors: Map<string, DashboardError>
  /** Map of inline errors by control ID */
  inlineErrors: Map<string, DashboardError>
  
  /** Add or update a system error */
  setSystemError: (error: IpcError | null) => void
  /** Dismiss the current system error */
  dismissSystemError: () => void
  
  /** Add or update a provider error */
  setProviderError: (providerId: string, error: IpcError | null) => void
  /** Dismiss a provider error */
  dismissProviderError: (providerId: string) => void
  /** Clear all provider errors */
  clearProviderErrors: () => void
  
  /** Add or update an inline error for a control */
  setInlineError: (controlId: string, error: IpcError | null) => void
  /** Dismiss an inline error */
  dismissInlineError: (controlId: string) => void
  /** Clear all inline errors */
  clearInlineErrors: () => void
  
  /** Clear all errors */
  clearAllErrors: () => void
}

function generateErrorId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

export const useDashboardErrorStore = create<DashboardErrorState>((set) => ({
  systemError: null,
  providerErrors: new Map(),
  inlineErrors: new Map(),

  setSystemError: (error: IpcError | null) => {
    if (error === null) {
      set({ systemError: null })
      return
    }

    const mappedError = mapIpcError(error)
    set({
      systemError: {
        id: generateErrorId(),
        mappedError,
        timestamp: Date.now(),
        dismissed: false
      }
    })
  },

  dismissSystemError: () => {
    set((state) => {
      if (!state.systemError) return state
      return {
        systemError: { ...state.systemError, dismissed: true }
      }
    })
    // Clear after a short delay to allow exit animation
    setTimeout(() => {
      set({ systemError: null })
    }, 300)
  },

  setProviderError: (providerId: string, error: IpcError | null) => {
    set((state) => {
      const newErrors = new Map(state.providerErrors)
      
      if (error === null) {
        newErrors.delete(providerId)
      } else {
        const mappedError = mapIpcError(error)
        newErrors.set(providerId, {
          id: generateErrorId(),
          mappedError,
          timestamp: Date.now(),
          dismissed: false
        })
      }
      
      return { providerErrors: newErrors }
    })
  },

  dismissProviderError: (providerId: string) => {
    set((state) => {
      const newErrors = new Map(state.providerErrors)
      const existing = newErrors.get(providerId)
      if (existing) {
        newErrors.set(providerId, { ...existing, dismissed: true })
      }
      return { providerErrors: newErrors }
    })
    // Clear after delay
    setTimeout(() => {
      set((state) => {
        const newErrors = new Map(state.providerErrors)
        newErrors.delete(providerId)
        return { providerErrors: newErrors }
      })
    }, 300)
  },

  clearProviderErrors: () => {
    set({ providerErrors: new Map() })
  },

  setInlineError: (controlId: string, error: IpcError | null) => {
    set((state) => {
      const newErrors = new Map(state.inlineErrors)
      
      if (error === null) {
        newErrors.delete(controlId)
      } else {
        const mappedError = mapIpcError(error)
        newErrors.set(controlId, {
          id: generateErrorId(),
          mappedError,
          timestamp: Date.now(),
          dismissed: false
        })
      }
      
      return { inlineErrors: newErrors }
    })
  },

  dismissInlineError: (controlId: string) => {
    set((state) => {
      const newErrors = new Map(state.inlineErrors)
      newErrors.delete(controlId)
      return { inlineErrors: newErrors }
    })
  },

  clearInlineErrors: () => {
    set({ inlineErrors: new Map() })
  },

  clearAllErrors: () => {
    set({
      systemError: null,
      providerErrors: new Map(),
      inlineErrors: new Map()
    })
  }
}))
