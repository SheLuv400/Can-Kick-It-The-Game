export type DesktopWindowMode = 'windowed' | 'borderless' | 'fullscreen'

export interface DesktopWindowState {
  mode: DesktopWindowMode
  frameless: boolean
  maximized: boolean
  platform: string
}

export interface DesktopWindowResult {
  state: DesktopWindowState
  reloading: boolean
}

export interface DesktopWindowApi {
  getState: () => Promise<DesktopWindowState>
  setMode: (mode: DesktopWindowMode) => Promise<DesktopWindowResult>
  quit: () => Promise<boolean>
  onStateChange: (listener: (state: DesktopWindowState) => void) => () => void
}

declare global {
  interface Window {
    cikiDesktop?: DesktopWindowApi
  }
}

export function getDesktopWindow(): DesktopWindowApi | undefined {
  return typeof window !== 'undefined' ? window.cikiDesktop : undefined
}

export function desktopPlatformLabel(platform: string): string {
  if (platform === 'win32') return 'WINDOWS'
  if (platform === 'darwin') return 'MACOS'
  return 'DESKTOP'
}

/**
 * Fullscreen never changes the native frame. Switching to or from a
 * borderless window needs Electron to rebuild the window, so that transition
 * is the only one the in-battle settings lock needs to block.
 */
export function canSwitchDesktopWindowMode(
  target: DesktopWindowMode,
  state: DesktopWindowState,
  locked: boolean,
): boolean {
  if (!locked || target === 'fullscreen') return true
  return (target === 'borderless') === state.frameless
}
