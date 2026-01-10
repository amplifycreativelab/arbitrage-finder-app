declare global {
  interface Window {
    electron: any
    api: {
      credentials: any
      feed: {
        runManualFetch: () => Promise<void>
      }
    }
  }
}

export {}

