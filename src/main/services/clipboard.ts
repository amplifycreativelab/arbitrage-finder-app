let clipboard:
  | (typeof import('electron'))['clipboard']
  | undefined

const hasElectronRuntime =
  typeof process !== 'undefined' &&
  typeof process.versions !== 'undefined' &&
  !!process.versions.electron

if (hasElectronRuntime) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron') as typeof import('electron')
  clipboard = electron.clipboard
}

export function copyTextToClipboard(text: string): void {
  if (!clipboard) {
    throw new Error('Clipboard API is not available outside Electron runtime.')
  }

  clipboard.writeText(text)
}

