export type GamepadAction =
  | 'confirm'
  | 'back'
  | 'pause'
  | 'inspect'
  | 'backstage'
  | 'hand-prev'
  | 'hand-next'
  | 'area-prev'
  | 'area-next'

export type GamepadBindings = Record<GamepadAction, number>

export const GAMEPAD_BINDINGS_EVENT = 'ciki:gamepad-bindings'

const STORAGE_KEY = 'ciki.gamepad.v1'

/** Standard-mapping buttons only. The Xbox guide button stays reserved. */
export const BINDABLE_GAMEPAD_BUTTONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

export const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
  confirm: 0,
  back: 1,
  inspect: 2,
  backstage: 3,
  'hand-prev': 4,
  'hand-next': 5,
  'area-prev': 6,
  'area-next': 7,
  pause: 9,
}

export const GAMEPAD_ACTION_META: Array<{
  id: GamepadAction
  label: string
  detail: string
}> = [
  { id: 'confirm', label: 'CONFIRM / SELECT', detail: 'Activate the focused control or play a legal card.' },
  { id: 'back', label: 'CANCEL / BACK', detail: 'Close a panel or cancel the current selection.' },
  { id: 'inspect', label: 'INSPECT CARD', detail: 'Open the focused Artist Card details.' },
  { id: 'backstage', label: 'BACKSTAGE', detail: 'Open the Backstage recall panel.' },
  { id: 'hand-prev', label: 'PREVIOUS HAND CARD', detail: 'Move focus left through your hand.' },
  { id: 'hand-next', label: 'NEXT HAND CARD', detail: 'Move focus right through your hand.' },
  { id: 'area-prev', label: 'PREVIOUS AREA', detail: 'Move to the previous battlefield region.' },
  { id: 'area-next', label: 'NEXT AREA', detail: 'Move to the next battlefield region.' },
  { id: 'pause', label: 'PAUSE', detail: 'Open the battle pause menu or Settings outside a battle.' },
]

const BUTTON_LABELS = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'VIEW',
  'MENU',
  'LS',
  'RS',
  'D-PAD UP',
  'D-PAD DOWN',
  'D-PAD LEFT',
  'D-PAD RIGHT',
  'GUIDE',
  'R3',
]

const BUTTON_NAMES = [
  'A / Cross',
  'B / Circle',
  'X / Square',
  'Y / Triangle',
  'Left bumper',
  'Right bumper',
  'Left trigger',
  'Right trigger',
  'View / Share',
  'Menu / Start',
  'Left stick click',
  'Right stick click',
  'D-pad up',
  'D-pad down',
  'D-pad left',
  'D-pad right',
  'Guide (reserved)',
  'Right stick click',
]

export function gamepadButtonLabel(index: number): string {
  return BUTTON_LABELS[index] ?? `B${index}`
}

export function gamepadButtonName(index: number): string {
  return BUTTON_NAMES[index] ?? `Button ${index}`
}

export function isBindableGamepadButton(index: number): boolean {
  return (BINDABLE_GAMEPAD_BUTTONS as readonly number[]).includes(index)
}

function normalizeBindings(
  input: Partial<Record<GamepadAction, unknown>>,
): GamepadBindings {
  const used = new Set<number>()
  const next = { ...DEFAULT_GAMEPAD_BINDINGS }
  for (const action of GAMEPAD_ACTION_META) {
    const preferred = input[action.id]
    const preferredValid =
      typeof preferred === 'number' &&
      Number.isInteger(preferred) &&
      isBindableGamepadButton(preferred) &&
      !used.has(preferred)
    const fallback = DEFAULT_GAMEPAD_BINDINGS[action.id]
    const value = preferredValid
      ? preferred
      : !used.has(fallback)
        ? fallback
        : BINDABLE_GAMEPAD_BUTTONS.find((button) => !used.has(button))
    if (value === undefined) break
    next[action.id] = value
    used.add(value)
  }
  return next
}

export function loadGamepadBindings(): GamepadBindings {
  if (typeof window === 'undefined') return { ...DEFAULT_GAMEPAD_BINDINGS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_GAMEPAD_BINDINGS }
    return normalizeBindings(
      JSON.parse(raw) as Partial<Record<GamepadAction, unknown>>,
    )
  } catch {
    return { ...DEFAULT_GAMEPAD_BINDINGS }
  }
}

export function saveGamepadBindings(bindings: GamepadBindings): GamepadBindings {
  const next = normalizeBindings(bindings)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage can be unavailable in private mode; the live session still works.
    }
    window.dispatchEvent(new CustomEvent(GAMEPAD_BINDINGS_EVENT, { detail: next }))
  }
  return next
}

export function swapGamepadBinding(
  bindings: GamepadBindings,
  action: GamepadAction,
  button: number,
): GamepadBindings {
  if (!isBindableGamepadButton(button)) return bindings
  const next = { ...bindings }
  const previous = next[action]
  const conflict = GAMEPAD_ACTION_META.find(
    (item) => item.id !== action && next[item.id] === button,
  )
  next[action] = button
  if (conflict) next[conflict.id] = previous
  return next
}
