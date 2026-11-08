import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  addFriendToAccount,
  loadSessionAccount,
  registerAccount,
  recordMatchForAccount,
  rememberFriendName as rememberFriendNameInStore,
  removeFriendFromAccount,
  setAccountAvatar,
  setAccountTitle,
  signInAccount,
  signOutSession,
  syncLegacyForAccount,
  type AccountPublic,
  type MatchStatsInput,
  type PlayerLegacyInput,
} from './account'

interface AccountContextValue {
  account: AccountPublic | null
  busy: boolean
  register: (username: string, password: string) => Promise<AccountPublic>
  login: (username: string, password: string) => Promise<AccountPublic>
  logout: () => void
  addFriend: (code: string) => AccountPublic
  removeFriend: (code: string) => AccountPublic
  setAvatarArtist: (artistId: string | null) => void
  setActiveTitle: (titleId: string | null) => void
  rememberFriendName: (code: string, name: string) => void
  recordMatch: (input: MatchStatsInput) => void
  syncLegacy: (input: PlayerLegacyInput) => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountPublic | null>(() => loadSessionAccount())
  const [busy, setBusy] = useState(false)

  const register = useCallback(async (username: string, password: string) => {
    setBusy(true)
    try {
      const next = await registerAccount(username, password)
      setAccount(next)
      return next
    } finally {
      setBusy(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setBusy(true)
    try {
      const next = await signInAccount(username, password)
      setAccount(next)
      return next
    } finally {
      setBusy(false)
    }
  }, [])

  const logout = useCallback(() => {
    signOutSession()
    setAccount(null)
  }, [])

  const addFriend = useCallback(
    (code: string) => {
      if (!account) throw new Error('SIGN IN TO ADD FRIENDS.')
      const next = addFriendToAccount(account.id, code)
      setAccount(next)
      return next
    },
    [account],
  )

  const removeFriend = useCallback(
    (code: string) => {
      if (!account) throw new Error('SIGN IN TO EDIT FRIENDS.')
      const next = removeFriendFromAccount(account.id, code)
      setAccount(next)
      return next
    },
    [account],
  )

  const setAvatarArtist = useCallback(
    (artistId: string | null) => {
      if (!account) throw new Error('SIGN IN TO EDIT YOUR PROFILE ARTIST.')
      setAccount(setAccountAvatar(account.id, artistId))
    },
    [account],
  )

  const setActiveTitle = useCallback(
    (titleId: string | null) => {
      if (!account) throw new Error('SIGN IN TO EDIT YOUR CARD TITLE.')
      setAccount(setAccountTitle(account.id, titleId))
    },
    [account],
  )

  const rememberFriendName = useCallback(
    (code: string, name: string) => {
      if (!account) return
      const next = rememberFriendNameInStore(account.id, code, name)
      if (next) setAccount(next)
    },
    [account],
  )

  const recordMatch = useCallback(
    (input: MatchStatsInput) => {
      if (!account) return
      try {
        setAccount(recordMatchForAccount(account.id, input))
      } catch {
        // A missed stat write must never interrupt the results screen.
      }
    },
    [account],
  )

  const syncLegacy = useCallback(
    (input: PlayerLegacyInput) => {
      if (!account) return
      const stats = account.stats
      if (
        stats.badgeXp === input.badgeXp &&
        stats.badgeTiers === input.badgeTiers &&
        stats.artistLevels === input.artistLevels &&
        stats.labelScore === input.labelScore &&
        stats.chartHeat === input.chartHeat
      ) {
        return
      }
      try {
        setAccount(syncLegacyForAccount(account.id, input))
      } catch {
        // A failed metadata sync must not interrupt the game.
      }
    },
    [account],
  )

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      busy,
      register,
      login,
      logout,
      addFriend,
      removeFriend,
      setAvatarArtist,
      setActiveTitle,
      rememberFriendName,
      recordMatch,
      syncLegacy,
    }),
    [account, busy, register, login, logout, addFriend, removeFriend, setAvatarArtist, setActiveTitle, rememberFriendName, recordMatch, syncLegacy],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount must be used inside AccountProvider')
  return context
}
