import * as React from 'react'

import { Button } from '../../components/ui/button'
import { useDeepScanStore } from './stores/deepScanStore'

export function DeepScanButton(): React.JSX.Element {
  const status = useDeepScanStore((state) => state.progress.status)
  const isStarting = useDeepScanStore((state) => state.isStarting)
  const setDialogOpen = useDeepScanStore((state) => state.setDialogOpen)
  const cancelScan = useDeepScanStore((state) => state.cancelScan)

  const isScanning = status === 'scanning'

  if (isScanning) {
    return (
      <Button
        variant="outline"
        className="h-8 px-3 text-[11px]"
        onClick={() => void cancelScan()}
        data-testid="deep-scan-cancel-button"
      >
        Cancel Scan
      </Button>
    )
  }

  return (
    <Button
      className="h-8 px-3 text-[11px]"
      onClick={() => setDialogOpen(true)}
      disabled={isStarting}
      data-testid="deep-scan-start-button"
    >
      Start Deep Scan
    </Button>
  )
}

export default DeepScanButton

