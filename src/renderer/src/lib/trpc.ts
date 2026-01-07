import { createTRPCProxyClient } from '@trpc/client'
import { ipcLink } from 'electron-trpc/renderer'
import type { AppRouter } from '../../../main/services/router'

type TrpcClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>

const hasElectronTrpc =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as { electronTRPC?: unknown }).electronTRPC !== 'undefined'

function createTestTrpcClient(): TrpcClient {
  const notConnectedError = (): never => {
    throw new Error(
      'TRPC renderer client is not connected. In tests or non-Electron environments, stub trpcClient methods as needed.'
    )
  }

  const noopMutation = async (..._args: unknown[]): Promise<never> => {
    return notConnectedError()
  }

  const noopQuery = async (..._args: unknown[]): Promise<never> => {
    return notConnectedError()
  }

  const client = {
    saveApiKey: { mutate: noopMutation },
    isProviderConfigured: { query: noopQuery },
    getActiveProvider: { query: noopQuery },
    setActiveProvider: { mutate: noopMutation },
    getStorageStatus: { query: noopQuery },
    acknowledgeFallbackWarning: { mutate: noopMutation },
    getFeedSnapshot: { query: noopQuery },
    pollAndGetFeedSnapshot: { mutate: noopMutation },
    copySignalToClipboard: { mutate: noopMutation },
    openLogDirectory: { mutate: noopMutation }
  } as unknown as TrpcClient

  return client
}

export const trpcClient: TrpcClient = hasElectronTrpc
  ? createTRPCProxyClient<AppRouter>({
      links: [ipcLink()]
    })
  : createTestTrpcClient()
