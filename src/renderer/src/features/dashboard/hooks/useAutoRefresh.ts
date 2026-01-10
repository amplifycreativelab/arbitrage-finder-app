import * as React from 'react'
import { useFeedStore } from '../stores/feedStore'
import { useAppSettingsStore } from '../../settings/stores/appSettingsStore'

export function useAutoRefresh(): void {
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)
  const autoRefreshEnabled = useAppSettingsStore((state) => state.autoRefreshEnabled)
  const refreshIntervalMs = useAppSettingsStore((state) => state.refreshIntervalMs)

  React.useEffect(() => {
    if (!autoRefreshEnabled || refreshIntervalMs <= 0) {
      return
    }

    const intervalId = setInterval(() => {
      void refreshSnapshot()
    }, refreshIntervalMs)

    return () => {
      clearInterval(intervalId)
    }
  }, [autoRefreshEnabled, refreshIntervalMs, refreshSnapshot])
}
