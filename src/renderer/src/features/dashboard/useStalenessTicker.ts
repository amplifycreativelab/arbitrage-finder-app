import * as React from 'react'

const DEFAULT_INTERVAL_MS = 30_000

export function useStalenessTicker(intervalMs: number = DEFAULT_INTERVAL_MS): number {
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const id: ReturnType<typeof setInterval> = setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => {
      clearInterval(id)
    }
  }, [intervalMs])

  return now
}

