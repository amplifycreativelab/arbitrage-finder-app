import { createTRPCProxyClient } from '@trpc/client'
import { ipcLink } from 'electron-trpc/renderer'
import type { AppRouter } from '../../../main/services/router'

const hasElectronTrpc =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as { electronTRPC?: unknown }).electronTRPC !== 'undefined'

export const trpcClient = createTRPCProxyClient<AppRouter>({
  // In Electron renderer we use ipcLink; in tests or non-Electron environments
  // we fall back to an empty link array and avoid touching the electronTRPC global.
  links: hasElectronTrpc ? [ipcLink()] : []
})
