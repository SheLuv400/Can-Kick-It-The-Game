import {
  BINDABLE_GAMEPAD_BUTTONS,
  GAMEPAD_BINDINGS_EVENT,
  loadGamepadBindings,
  type GamepadAction,
  type GamepadBindings,
} from './gamepad-bindings'

export type GamepadCommand =
  | 'pause'
  | 'inspect'
  | 'backstage'
  | 'hand-prev'
  | 'hand-next'
  | 'area-prev'
  | 'area-next'
  | 'end-turn'
  | 'next-ready'
  | 'target-prev'
  | 'target-next'

export interface GamepadConnectionState {
  connected: boolean
  index: number | null
  id: string | null
}

export const GAMEPAD_COMMAND_EVENT = 'ciki:gamepad-command'
export const GAMEPAD_OPEN_SETTINGS_EVENT = 'ciki:gamepad-open-settings'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]',
].join(',')

const SCRIM_SELECTOR = [
  '.modal__scrim',
  '.logpanel__scrim',
  '.track-player__scrim',
  '.portrait-studio__scrim',
  '.portrait-uploader__scrim',
].join(',')

const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '.battle-pause',
  '.result',
  '.show-intro',
  '.cine',
  '.crate-reveal',
  '.logpanel.is-open',
  '.card-inspector',
].join(',')

const PANEL_SELECTOR = [
  '.modal__panel',
  '.battle-pause__panel',
  '.show-intro__panel',
  '.result__panel',
  '.track-player__panel',
  '.portrait-studio__panel',
  '.portrait-uploader__panel',
  '.card-inspector__panel',
].join(',')

const BACK_TEXT =
  /^(?:[←‹«]\s*)?(?:back(?:\s+to(?:\s+the)?(?:\s+(?:show|block|menu))?)?|main menu|the show|exit(?:\s+training)?|menu|leave(?:\s+(?:the\s+show|room))?|circuit board)\b/i

const DEADZONE = 0.45
const REPEAT_DELAY_MS = 360
const REPEAT_RATE_MS = 110
const AUTO_FOCUS_MS = 240

type Direction = 'up' | 'down' | 'left' | 'right'

interface FocusScope {
  root: HTMLElement
  focusRoot: HTMLElement
  overlay: boolean
}

export interface GamepadControlOptions {
  onInput?: () => void
  onConnectionChange?: (state: GamepadConnectionState) => void
}

let captureHandler: ((button: number) => void) | null = null

export function isGamepadApiAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
}

/**
 * The Settings remap rows use this to consume exactly one physical button
 * before the normal menu action runs. Returns a cancel function.
 */
export function captureNextGamepadButton(handler: (button: number) => void): () => void {
  captureHandler = handler
  return () => {
    if (captureHandler === handler) captureHandler = null
  }
}

function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected) return false
  if (element.closest('[aria-hidden="true"], [inert]')) return false
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  if (Number(style.opacity) === 0) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1
}

function isFocusable(element: HTMLElement): boolean {
  if (!isVisible(element)) return false
  if (element.tabIndex < 0) return false
  if (element.matches(':disabled')) return false
  if (element.getAttribute('aria-disabled') === 'true') return false
  if (element.closest(SCRIM_SELECTOR)) return false
  if (element.closest('.controller-hud')) return false
  if (element.closest('.logpanel:not(.is-open)')) return false
  const style = window.getComputedStyle(element)
  return style.visibility !== 'hidden' && style.display !== 'none'
}

function hasFocusableAncestor(element: HTMLElement, scope: HTMLElement): boolean {
  let parent = element.parentElement
  while (parent && parent !== scope) {
    if (parent.matches(FOCUSABLE_SELECTOR) && isFocusable(parent)) return true
    parent = parent.parentElement
  }
  return false
}

function getFocusables(scope: HTMLElement): HTMLElement[] {
  const nodes = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return nodes.filter(
    (node) => isFocusable(node) && !hasFocusableAncestor(node, scope),
  )
}

function visibleOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)).filter(
    (element) => isVisible(element) && !element.closest('.controller-hud'),
  )
}

function findScope(): FocusScope {
  const overlays = visibleOverlays()
  const root = overlays[overlays.length - 1]
  if (root) {
    let focusRoot = root.querySelector<HTMLElement>(PANEL_SELECTOR) ?? root
    if (focusRoot !== root && getFocusables(focusRoot).length === 0) focusRoot = root
    return { root, focusRoot, overlay: true }
  }
  const app = document.querySelector<HTMLElement>('.app') ?? document.body
  return { root: app, focusRoot: app, overlay: false }
}

function looksLikeBackControl(element: HTMLElement): boolean {
  if (element.classList.contains('icon-btn')) return true
  if (element.classList.contains('team__brand')) return true
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
  const aria = element.getAttribute('aria-label') ?? ''
  return BACK_TEXT.test(text) || BACK_TEXT.test(aria)
}

function chooseInitial(scope: FocusScope): HTMLElement | null {
  const focusables = getFocusables(scope.focusRoot)
  const primary = focusables.find((element) =>
    element.hasAttribute('data-gamepad-primary'),
  )
  if (primary) return primary

  const inBattle = Boolean(
    scope.root.closest('.battle') || scope.focusRoot.querySelector('.battle'),
  )
  if (inBattle) {
    const stageUnits = Array.from(
      scope.focusRoot.querySelectorAll<HTMLElement>(
        '.stage--player .stage-unit[role="button"]:not(.is-down)',
      ),
    )
    const stage = stageUnits.find(isFocusable)
    if (stage) return stage
    // A dock closing can briefly remove layout from the board. Wait for the
    // live artist cards instead of parking focus on the battle toolbar.
    if (stageUnits.length > 0) return null
    const handUnits = Array.from(
      scope.focusRoot.querySelectorAll<HTMLElement>('.hand .card[role="button"]'),
    )
    const hand = handUnits.find(isFocusable)
    if (hand) return hand
    if (handUnits.length > 0) return null
  }

  return (
    focusables.find((element) => !looksLikeBackControl(element)) ??
    focusables[0] ??
    null
  )
}

export function focusGamepadElement(element: HTMLElement | null): boolean {
  if (!element || !isFocusable(element)) return false
  element.focus({ preventScroll: true })
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  return true
}

function ensureFocus(scope: FocusScope): { changed: boolean; element: HTMLElement | null } {
  const active = document.activeElement
  if (
    active instanceof HTMLElement &&
    scope.focusRoot.contains(active) &&
    isFocusable(active)
  ) {
    return { changed: false, element: active }
  }
  const target = chooseInitial(scope)
  if (!target) return { changed: false, element: null }
  focusGamepadElement(target)
  return { changed: true, element: target }
}

function overlapLength(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
}

function moveFocus(direction: Direction): void {
  const scope = findScope()
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || !scope.focusRoot.contains(active)) return

  const current = active.getBoundingClientRect()
  const candidates = getFocusables(scope.focusRoot).filter(
    (element) => element !== active,
  )
  let best: HTMLElement | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect()
    const dx = rect.left + rect.width / 2 - (current.left + current.width / 2)
    const dy = rect.top + rect.height / 2 - (current.top + current.height / 2)
    const horizontal = direction === 'left' || direction === 'right'
    const primary = horizontal ? dx : dy
    const secondary = horizontal ? dy : dx

    if (direction === 'right' && primary <= 2) continue
    if (direction === 'left' && primary >= -2) continue
    if (direction === 'down' && primary <= 2) continue
    if (direction === 'up' && primary >= -2) continue

    const overlap = horizontal
      ? overlapLength(current.top, current.bottom, rect.top, rect.bottom)
      : overlapLength(current.left, current.right, rect.left, rect.right)
    const overlapRatio =
      overlap / Math.max(1, Math.min(current.height, rect.height))
    const score =
      Math.abs(primary) +
      Math.abs(secondary) * 2.4 -
      overlapRatio * Math.min(Math.abs(primary), 160) * 0.9

    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }

  if (best) focusGamepadElement(best)
}

function adjustRange(input: HTMLInputElement, direction: Direction): void {
  if (direction !== 'left' && direction !== 'right') return
  const before = input.value
  if (direction === 'right') input.stepUp()
  else input.stepDown()
  if (input.value === before) return
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function confirm(scope: FocusScope): void {
  const { changed, element } = ensureFocus(scope)
  if (changed || !element) return
  if (element instanceof HTMLInputElement) {
    if (element.type === 'range') return
    element.focus()
    element.click()
    return
  }
  if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    element.focus()
    return
  }
  element.click()
}

function findBackControl(root: HTMLElement): HTMLElement | null {
  const focusables = getFocusables(root)
  const byData = focusables.find((element) => element.hasAttribute('data-gamepad-back'))
  if (byData) return byData

  const byLabel = focusables.find((element) => {
    const label = element.getAttribute('aria-label') ?? ''
    return /^(close|back|exit|stay)\b/i.test(label) || /back\b/i.test(label)
  })
  if (byLabel) return byLabel

  const scrim = root.querySelector<HTMLElement>(SCRIM_SELECTOR)
  if (scrim && isVisible(scrim)) return scrim
  return null
}

function findBackText(root: HTMLElement): HTMLElement | null {
  return (
    getFocusables(root).find((element) => {
      const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
      const aria = element.getAttribute('aria-label') ?? ''
      return BACK_TEXT.test(text) || BACK_TEXT.test(aria)
    }) ?? null
  )
}

function dispatchEscape(): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  )
}

function cancel(): void {
  const scope = findScope()

  if (scope.overlay) {
    if (
      scope.root.matches('.counter') ||
      scope.root.matches('.tutorial-defense') ||
      scope.root.matches('.tutorial-special-pick')
    ) {
      return
    }
    if (scope.root.matches('.battle-pause')) {
      const resume = scope.focusRoot.querySelector<HTMLElement>(
        '[data-gamepad-primary]',
      )
      if (resume) {
        resume.click()
        return
      }
      dispatchEscape()
      return
    }
    const back = findBackControl(scope.root)
    if (back) {
      back.click()
      return
    }
    const textBack = findBackText(scope.focusRoot)
    if (textBack) textBack.click()
    return
  }

  if (document.querySelector('.battle')) {
    dispatchEscape()
    return
  }

  const back = findBackControl(scope.focusRoot) ?? findBackText(scope.focusRoot)
  if (back) {
    back.click()
    return
  }
  dispatchEscape()
}

function dispatchCommand(command: GamepadCommand): void {
  window.dispatchEvent(
    new CustomEvent<{ command: GamepadCommand }>(GAMEPAD_COMMAND_EVENT, {
      detail: { command },
    }),
  )
}

function openControllerMenu(): void {
  const overlays = visibleOverlays()
  if (document.querySelector('.battle')) {
    const pause = overlays.find((element) => element.classList.contains('battle-pause'))
    const other = overlays.find((element) => element !== pause)
    if (other) return
    dispatchCommand('pause')
    return
  }
  if (overlays.length > 0) return
  window.dispatchEvent(new Event(GAMEPAD_OPEN_SETTINGS_EVENT))
}

function buttonPressed(pad: Gamepad, index: number): boolean {
  return Boolean(pad.buttons[index]?.pressed)
}

function readDirection(pad: Gamepad): Direction | null {
  if (buttonPressed(pad, 12)) return 'up'
  if (buttonPressed(pad, 13)) return 'down'
  if (buttonPressed(pad, 14)) return 'left'
  if (buttonPressed(pad, 15)) return 'right'
  const x = pad.axes[0] ?? 0
  const y = pad.axes[1] ?? 0
  if (Math.hypot(x, y) < DEADZONE) return null
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? 'right' : 'left'
  return y > 0 ? 'down' : 'up'
}

function actionForButton(
  button: number,
  bindings: GamepadBindings,
): GamepadAction | null {
  for (const action of Object.keys(bindings) as GamepadAction[]) {
    if (bindings[action] === button) return action
  }
  return null
}

export function installGamepadControls(options: GamepadControlOptions): () => void {
  if (typeof window === 'undefined' || !isGamepadApiAvailable()) {
    return () => undefined
  }

  let frame = 0
  let activeIndex: number | null = null
  let previousButtons: boolean[] = []
  let lastDirection: Direction | null = null
  let nextDirectionAt = 0
  let lastAutoFocus = 0
  let controllerActive = false
  let connectionKey = ''
  let bindings = loadGamepadBindings()

  const refreshBindings = (event: Event) => {
    const detail = (event as CustomEvent<GamepadBindings>).detail
    bindings = detail ? { ...detail } : loadGamepadBindings()
  }

  const deactivate = () => {
    if (!controllerActive) return
    controllerActive = false
    document.body.classList.remove('is-controller')
  }

  const activate = () => {
    if (controllerActive) return
    controllerActive = true
    lastAutoFocus = 0
    document.body.classList.add('is-controller')
  }

  const publishConnection = (pad: Gamepad | null) => {
    const state: GamepadConnectionState = pad
      ? { connected: true, index: pad.index, id: pad.id }
      : { connected: false, index: null, id: null }
    const key = `${state.connected}:${state.index ?? ''}:${state.id ?? ''}`
    if (key === connectionKey) return
    connectionKey = key
    options.onConnectionChange?.(state)
  }

  const getPads = (): Gamepad[] => {
    try {
      return Array.from(navigator.getGamepads()).filter(
        (pad): pad is Gamepad => Boolean(pad?.connected),
      )
    } catch {
      return []
    }
  }

  const handleConnected = (event: Event) => {
    const pad = (event as GamepadEvent).gamepad
    if (pad) activeIndex = pad.index
  }

  const handleDisconnected = (event: Event) => {
    const pad = (event as GamepadEvent).gamepad
    if (pad && pad.index === activeIndex) activeIndex = null
  }

  const handleHumanInput = (event: Event) => {
    if (!event.isTrusted) return
    deactivate()
  }

  const autoFocus = (now: number) => {
    if (!controllerActive || document.visibilityState === 'hidden') return
    if (now - lastAutoFocus < AUTO_FOCUS_MS) return
    lastAutoFocus = now
    const scope = findScope()
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      scope.focusRoot.contains(active) &&
      isFocusable(active)
    ) {
      return
    }
    focusGamepadElement(chooseInitial(scope))
  }

  const tick = (now: number) => {
    frame = window.requestAnimationFrame(tick)
    const pads = getPads()
    let pad = activeIndex === null ? undefined : pads.find((item) => item.index === activeIndex)
    if (!pad) {
      pad = pads[0]
      if (pad && activeIndex !== pad.index) {
        activeIndex = pad.index
        previousButtons = []
        lastDirection = null
      }
    }
    publishConnection(pad ?? null)

    if (!pad) {
      deactivate()
      activeIndex = null
      previousButtons = []
      lastDirection = null
      return
    }

    const pressed = pad.buttons.map((button) => Boolean(button.pressed))
    const justPressed = pressed
      .map((isPressed, index) => (isPressed && !previousButtons[index] ? index : -1))
      .filter((index) => index >= 0)
    const direction = readDirection(pad)
    const directionChanged = direction !== null && direction !== lastDirection
    const directionRepeat =
      direction !== null && !directionChanged && now >= nextDirectionAt
    const directionAction = directionChanged || directionRepeat

    // Settings can be opened with a mouse, so capture must work before the
    // controller has activated normal focus. Otherwise the first press would
    // only be consumed waking the pad and the remap would appear broken.
    if (captureHandler && justPressed.length > 0) {
      const button = justPressed.find((index) =>
        (BINDABLE_GAMEPAD_BUTTONS as readonly number[]).includes(index),
      )
      if (button !== undefined) {
        activate()
        const handler = captureHandler
        captureHandler = null
        handler(button)
        previousButtons = pressed
        lastDirection = direction
        return
      }
    }

    if (!controllerActive) {
      if (justPressed.length === 0 && !directionAction) {
        previousButtons = pressed
        lastDirection = direction
        return
      }
      activate()
      lastAutoFocus = 0
      const scope = findScope()
      ensureFocus(scope)
      options.onInput?.()
      nextDirectionAt = now + REPEAT_DELAY_MS
      lastDirection = direction
      previousButtons = pressed
      return
    }

    if (justPressed.length === 0 && !directionAction) {
      previousButtons = pressed
      lastDirection = direction
      autoFocus(now)
      return
    }

    const scope = findScope()
    const focusResult = ensureFocus(scope)
    options.onInput?.()

    if (directionAction) {
      if (!focusResult.changed) {
        const active = document.activeElement
        if (active instanceof HTMLInputElement && active.type === 'range') {
          adjustRange(active, direction as Direction)
        } else {
          moveFocus(direction as Direction)
        }
      }
      nextDirectionAt = now + (directionChanged ? REPEAT_DELAY_MS : REPEAT_RATE_MS)
    }

    for (const button of justPressed) {
      const action = actionForButton(button, bindings)
      if (!action) continue
      if (action === 'confirm') {
        // A lost focus (a card re-render, a closing intro) must not swallow the
        // press: confirm() re-establishes focus and then activates it.
        confirm(scope)
      } else if (action === 'back') {
        cancel()
      } else if (action === 'pause') {
        openControllerMenu()
      } else if (action === 'inspect') {
        dispatchCommand('inspect')
      } else if (action === 'backstage') {
        dispatchCommand('backstage')
      } else if (action === 'hand-prev') {
        dispatchCommand('hand-prev')
      } else if (action === 'hand-next') {
        dispatchCommand('hand-next')
      } else if (action === 'area-prev') {
        dispatchCommand('area-prev')
      } else if (action === 'area-next') {
        dispatchCommand('area-next')
      }
      // One physical button maps to one action. A remap file loaded from a
      // malformed source cannot fire two actions from a single press.
      break
    }

    previousButtons = pressed
    lastDirection = direction
  }

  window.addEventListener('gamepadconnected', handleConnected)
  window.addEventListener('gamepaddisconnected', handleDisconnected)
  window.addEventListener(GAMEPAD_BINDINGS_EVENT, refreshBindings)
  window.addEventListener('pointerdown', handleHumanInput, true)
  window.addEventListener('keydown', handleHumanInput, true)
  frame = window.requestAnimationFrame(tick)

  return () => {
    window.cancelAnimationFrame(frame)
    window.removeEventListener('gamepadconnected', handleConnected)
    window.removeEventListener('gamepaddisconnected', handleDisconnected)
    window.removeEventListener(GAMEPAD_BINDINGS_EVENT, refreshBindings)
    window.removeEventListener('pointerdown', handleHumanInput, true)
    window.removeEventListener('keydown', handleHumanInput, true)
    document.body.classList.remove('is-controller')
    if (captureHandler) captureHandler = null
  }
}

export function onGamepadCommand(handler: (command: GamepadCommand) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ command?: GamepadCommand }>).detail
    if (detail?.command) handler(detail.command)
  }
  window.addEventListener(GAMEPAD_COMMAND_EVENT, listener)
  return () => window.removeEventListener(GAMEPAD_COMMAND_EVENT, listener)
}
