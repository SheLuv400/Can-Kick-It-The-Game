import { useState, type FormEvent } from 'react'
import { emptyPlayerStats, favoriteArtistId } from '../account/account'
import { careerTitleForId, careerUnlockedTitles, type CareerState } from '../game/career'
import { useAccount } from '../account/AccountProvider'
import { getArtist } from '../game/roster'
import { AvatarPickerModal } from './AvatarPickerModal'
import { PlayerCardModal } from './PlayerCardModal'
import { Portrait } from './Portrait'

export function AccountModal({ onClose, career }: { onClose: () => void; career?: CareerState | null }) {
  const { account, busy, login, register, logout, setAvatarArtist, setActiveTitle } = useAccount()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      if (mode === 'register') await register(username, password)
      else await login(username, password)
      setPassword('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'COULD NOT SIGN IN.')
    }
  }

  const copyCode = async () => {
    if (!account) return
    try {
      await navigator.clipboard.writeText(account.friendCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('COPY IS BLOCKED IN THIS WINDOW.')
    }
  }

  const stats = account?.stats ?? emptyPlayerStats()
  const decided = stats.wins + stats.losses
  const winRate = decided > 0 ? Math.round((stats.wins / decided) * 100) : null
  const favoriteId = favoriteArtistId(stats)
  const favorite = favoriteId ? getArtist(favoriteId) : null
  const favoritePlays = favoriteId ? stats.artistPlays[favoriteId] ?? 0 : 0
  const avatarArtist = account?.avatarArtistId ? getArtist(account.avatarArtistId) : null
  const unlockedTitles = career ? careerUnlockedTitles(career) : []
  const selectedTitle = careerTitleForId(account?.activeTitleId ?? 'unsigned')
  const chooseAvatar = (artistId: string) => {
    setAvatarArtist(artistId)
    setAvatarOpen(false)
  }
  const clearAvatar = () => {
    setAvatarArtist(null)
    setAvatarOpen(false)
  }
  const attackRate = Math.round((stats.attacks / Math.max(stats.actions, stats.attacks, 1)) * 100)
  const averageResponse = stats.responseSamples
    ? `${(stats.responseMs / stats.responseSamples / 1000).toFixed(1)}s`
    : '—'

  if (account && cardOpen) {
    return (
      <>
        <PlayerCardModal
          name={account.username}
          code={account.friendCode}
          stats={account.stats}
          avatarArtistId={account.avatarArtistId}
          titleId={account.activeTitleId}
          isSelf
          onEditAvatar={() => setAvatarOpen(true)}
          onClose={() => setCardOpen(false)}
        />
        {avatarOpen && (
          <AvatarPickerModal
            selectedId={account.avatarArtistId}
            onSelect={chooseAvatar}
            onClear={clearAvatar}
            onClose={() => setAvatarOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
    <div className="modal account-modal" role="dialog" aria-modal="true" aria-label="Account">
      <button className="modal__scrim" onClick={onClose} aria-label="Close account" />
      <div className="modal__panel account-panel">
        <header className="modal__head account-head">
          <div>
            <span className="kicker">CIKI ID · PLAYER DOSSIER</span>
            <h2>{account ? `WELCOME, ${account.username.toUpperCase()}` : 'GET ON THE MIC'}</h2>
            <p className="account-head__sub">
              {account ? 'YOUR BACKSTAGE PASS · RECORD · ONLINE IDENTITY' : 'YOUR LOCAL PROFILE AND FRIEND CODE LIVE HERE.'}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close account">
            ✕
          </button>
        </header>

        {account ? (
          <div className="account-body">
            <div className="account-card">
              <span className="account-card__avatar">
                {avatarArtist ? (
                  <Portrait artist={avatarArtist} crop="avatar" />
                ) : (
                  account.username.slice(0, 2).toUpperCase()
                )}
              </span>
              <div>
                <span>SIGNED IN AS</span>
                <b>{account.username}</b>
                <i>PROFILE SAVED ON THIS DEVICE · ONLINE READY</i>
                {selectedTitle && (
                  <em className="account-card__title" style={{ color: selectedTitle.color }}>
                    {selectedTitle.label}
                  </em>
                )}
              </div>
              <span className="account-online"><i /> LIVE</span>
            </div>

            <section className="account-friend-code">
              <div>
                <span>YOUR FRIEND CODE</span>
                <b>{account.friendCode}</b>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => void copyCode()}>
                {copied ? 'COPIED' : 'COPY CODE'}
              </button>
            </section>

            <div className="account-summary">
              <div><span>FRIENDS</span><b>{account.friends.length}</b></div>
              <div><span>RECORD</span><b>{stats.wins}W · {stats.losses}L</b><em>{stats.draws} DRAW{stats.draws === 1 ? '' : 'S'}</em></div>
              <div><span>WIN RATE</span><b>{winRate === null ? '—' : `${winRate}%`}</b><em>{decided} DECIDED</em></div>
              <div><span>SHOWS</span><b>{stats.matches}</b><em>SINCE {new Date(account.createdAt).toLocaleDateString()}</em></div>
            </div>

            <section className="account-title-picker" aria-label="Online player card title">
              <div>
                <span>ONLINE PLAYER CARD TITLE</span>
                <b style={{ color: selectedTitle?.color }}>{selectedTitle?.label ?? 'UNSIGNED'}</b>
                <em>{unlockedTitles.length} TITLES UNLOCKED IN MY ARTIST CAREER</em>
              </div>
              {unlockedTitles.length ? (
                <select
                  value={selectedTitle?.id ?? 'unsigned'}
                  onChange={(event) => setActiveTitle(event.target.value)}
                  aria-label="Select online player card title"
                >
                  {unlockedTitles.map((title) => (
                    <option key={title.id} value={title.id}>{title.label}</option>
                  ))}
                </select>
              ) : (
                <p>START A CAREER TO UNLOCK CARD TITLES.</p>
              )}
            </section>

            <section className="account-scout" aria-label="Scouting snapshot">
              <header>
                <span className="account-scout__kicker">SCOUTING SNAPSHOT</span>
                <em>WHAT THE ROOM KNOWS</em>
              </header>
              <div className="account-scout__grid">
                <div className="account-scout__favorite">
                  <span>FAVORITE CUT</span>
                  <b>{favorite ? favorite.name : 'NO SHOWS YET'}</b>
                  <em>{favorite ? `${favorite.crew} · ${favoritePlays} PLAY${favoritePlays === 1 ? '' : 'S'}` : 'PLAY A SHOW TO SET YOUR SIGNATURE'}</em>
                </div>
                <div>
                  <span>ATTACK RATE</span>
                  <b>{attackRate}%</b>
                  <em>{stats.attacks} ATTACKS / {stats.actions} ACTIONS</em>
                </div>
                <div>
                  <span>RESPONSE TEMPO</span>
                  <b>{averageResponse}</b>
                  <em>{stats.responseSamples} TIMED TURNS</em>
                </div>
              </div>
            </section>

            <p className="account-note">
              Friends and credentials live on this device. Your chosen artist fronts your player
              card, online identity and label profile. Add a friend by code from the online lobby.
              Your status, invites and latest stat sheet travel directly between players while you
              are online.
            </p>

            <div className="account-actions">
              <button className="btn btn--primary account-actions__card" onClick={() => setCardOpen(true)}>
                VIEW FULL PLAYER CARD
              </button>
              <button className="btn btn--ghost" onClick={() => setAvatarOpen(true)}>
                EDIT PROFILE ARTIST
              </button>
              <button className="btn btn--ghost" onClick={onClose}>BACK TO THE SHOW</button>
              <button
                className="account-signout account-actions__signout"
                onClick={() => {
                  logout()
                  setPassword('')
                  setError('')
                }}
              >
                SIGN OUT
              </button>
            </div>
          </div>
        ) : (
          <div className="account-auth">
            <div className="account-tabs" role="tablist" aria-label="Account action">
              <button
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => { setMode('login'); setError('') }}
                role="tab"
                aria-selected={mode === 'login'}
              >
                SIGN IN
              </button>
              <button
                className={mode === 'register' ? 'is-active' : ''}
                onClick={() => { setMode('register'); setError('') }}
                role="tab"
                aria-selected={mode === 'register'}
              >
                CREATE ACCOUNT
              </button>
            </div>

            <form className="account-form" onSubmit={(event) => void submit(event)}>
              <label>
                <span>USERNAME</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  maxLength={18}
                  minLength={3}
                  autoComplete="username"
                  placeholder="YOUR NAME ON THE MIC"
                  spellCheck={false}
                  autoFocus
                />
              </label>
              <label>
                <span>PASSWORD</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  maxLength={72}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder="6+ CHARACTERS"
                />
              </label>
              {error && <p className="account-error" role="alert">{error}</p>}
              <button className="btn btn--primary btn--xl" type="submit" disabled={busy}>
                {busy ? 'CHECKING THE LIST…' : mode === 'register' ? 'CREATE MY PROFILE' : 'SIGN IN'}
              </button>
              <p className="account-note">
                Username and password create a local CIKI profile. Your login is remembered on this
                device until you sign out. Passwords are salted and hashed, never stored in plain text.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
    {avatarOpen && (
      <AvatarPickerModal
        selectedId={account?.avatarArtistId ?? null}
        onSelect={chooseAvatar}
        onClear={clearAvatar}
        onClose={() => setAvatarOpen(false)}
      />
    )}
    </>
  )
}
