import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { Element, Settings } from '../game/types'
import { ELEMENT_META, ELEMENT_ORDER } from '../game/moves'
import { DIFFICULTIES } from '../game/themes'
import { CareerCardPanel } from '../components/CareerCardPanel'
import { CareerCreator } from '../components/CareerCreator'
import { CareerPresetArt } from '../components/CareerPresetArt'
import { CareerPresetPicker } from '../components/CareerPresetPicker'
import { careerPreset, type CareerPresetId } from '../game/career-presets'
import { CAREER_BADGE_SLOT_RANK } from '../game/career-data'
import {
  BADGE_BY_ID,
  BADGE_CATALOG,
  BADGE_TIER_META,
  badgeTierPower,
  badgeXpToNext,
  type BadgeId,
} from '../game/badges'
import {
  CAREER_AP_PER_LEVEL,
  CAREER_ATTRIBUTES,
  CAREER_DUAL_ELEMENT_OVR,
  CAREER_ELEMENT_UNLOCK_COST,
  CAREER_CREWS,
  CAREER_LOCAL_AP_DAILY_CAP,
  CAREER_LOCAL_AP_PER_WIN,
  CAREER_MAX_AP,
  CAREER_MAX_LEVEL,
  CAREER_MAX_OVR,
  CAREER_MAX_PRESTIGE,
  CAREER_MIN_OVR,
  CAREER_PRESTIGE_MAX_LEVEL,
  CAREER_MOVE_SLOTS,
  CAREER_PRESTIGE_XP_BONUS,
  CAREER_STARTING_AP,
  CAREER_TITLE,
  CAREER_TITLE_CATALOG,
  CAREER_CLIMB_TITLES,
  CAREER_LEGEND_TITLES,
  CAREER_MASTER_ENTRY_TITLES,
  careerTitleUnlockLabel,
  applyCareerUpgrades,
  careerArtist,
  careerBadgeCount,
  careerCardPower,
  careerMoveCatalog,
  careerBadgeSlots,
  careerChapter,
  careerChapterProgress,
  careerChapters,
  careerDualElementUnlocked,
  careerCompletedMissions,
  careerDeckLegal,
  careerHometown,
  careerMissionStatus,
  careerMoves,
  careerNextMission,
  careerPrestigeReady,
  careerReputationForOvr,
  careerUnlockedTitles,
  careerUpgradeCost,
  careerWinRate,
  clearCareerSecondaryElement,
  equipCareerElement,
  unlockCareerElement,
  careerXpSummary,
  CAREER_XP_TO_LEGEND,
  defaultCareerLoadout,
  equipCareerBadges,
  equipCareerMoves,
  newCareerDraft,
  prestigeCareer,
  setCareerLegacyStyle,
  spendCareerToken,
  syncCareer,
  updateCareerIdentity,
  updateCareerPreset,
  type CareerAttributeId,
  type CareerMission,
  type CareerMissionReport,
  type CareerSlotSummary,
  type CareerState,
} from '../game/career'

interface CareerProps {
  settings: Settings
  career: CareerState | null
  slots: CareerSlotSummary[]
  activeSlotId: string
  onSelectSlot: (slotId: string) => void
  onDeleteSlot: (slotId: string) => void
  report?: CareerMissionReport | null
  onDismissReport?: () => void
  onCareerChange: (career: CareerState) => void
  onStartMission: (mission: CareerMission) => void
  onStartLocal: () => void
  onDeck: () => void
  onBack: () => void
  onSettings: () => void
  onReset: () => void
}

type CareerView =
  | 'landing'
  | 'wizard'
  | 'hub'
  | 'artist'
  | 'development'
  | 'elements'
  | 'moves'
  | 'badges'
  | 'legacy'
  | 'preset'
  | 'missions'
  | 'record'
  | 'settings'

const HUB_ACTIONS: { view: Exclude<CareerView, 'landing' | 'wizard' | 'hub'>; label: string; note: string; icon: string }[] = [
  { view: 'missions', label: 'CONTINUE STORY', note: 'MISSIONS · CHAPTERS', icon: '▶' },
  { view: 'artist', label: 'MY ARTIST', note: 'LEVEL · OVR · IDENTITY', icon: '♛' },
  { view: 'development', label: 'ARTIST DEVELOPMENT', note: 'AP · ATTRIBUTES · OVR', icon: '▲' },
  { view: 'elements', label: 'ELEMENT LAB', note: 'UNLOCK · EQUIP · DUAL', icon: '✦' },
  { view: 'moves', label: 'EQUIP MOVES', note: '3 ACTION SLOTS', icon: '✎' },
  { view: 'badges', label: 'BADGES', note: 'PASSIVE PERFORMANCE', icon: '✦' },
  { view: 'legacy', label: 'PRESTIGE / LEGACY', note: '10 RUNS · TOKENS · TITLES', icon: '∞' },
  { view: 'preset', label: 'CHANGE ARTIST MODEL', note: '6 MALE · 6 FEMALE', icon: '♛' },
  { view: 'missions', label: 'CAREER MISSIONS', note: 'REPLAYABLE · REDUCED XP', icon: '☰' },
  { view: 'record', label: 'CAREER RECORD', note: 'BADGES · WINS · CLEARS', icon: '◉' },
  { view: 'settings', label: 'SAVE / SETTINGS', note: 'SAVE · AUDIO · RESET', icon: '⚙' },
]

const CAREER_NAV: { view: CareerView; label: string }[] = [
  { view: 'hub', label: 'HUB' },
  { view: 'missions', label: 'STORY' },
  { view: 'artist', label: 'ARTIST' },
  { view: 'development', label: 'DEVELOPMENT' },
  { view: 'elements', label: 'ELEMENTS' },
  { view: 'moves', label: 'MOVES' },
  { view: 'badges', label: 'BADGES' },
  { view: 'legacy', label: 'LEGACY' },
  { view: 'preset', label: 'MODEL' },
  { view: 'record', label: 'RECORD' },
  { view: 'settings', label: 'SETTINGS' },
]

function CareerNav({ current, onNavigate }: { current: CareerView; onNavigate: (view: CareerView) => void }) {
  return (
    <nav className="career-quicknav" aria-label="Career quick navigation">
      {CAREER_NAV.map((item) => (
        <button
          key={item.view}
          className={current === item.view ? 'is-on' : ''}
          aria-current={current === item.view ? 'page' : undefined}
          onClick={() => onNavigate(item.view)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function StatBar({ label, value, max = 99 }: { label: string; value: number; max?: number }) {
  return (
    <div className="career-stat">
      <span>{label}</span>
      <b>{value}</b>
      <i>
        <em style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </i>
    </div>
  )
}

function careerLevelLine(summary: ReturnType<typeof careerXpSummary>): string {
  return summary.master
    ? `MASTER LEVEL ${summary.level} / ${CAREER_MAX_LEVEL}`
    : `PRESTIGE ${summary.prestige} · LEVEL ${summary.level} / ${CAREER_PRESTIGE_MAX_LEVEL}`
}

function careerNextLevelLabel(summary: ReturnType<typeof careerXpSummary>): string {
  if (summary.level >= summary.levelCap) return summary.master ? 'MASTER LADDER MAXED' : 'PRESTIGE READY'
  if (summary.prestige >= CAREER_MAX_PRESTIGE && summary.level === CAREER_PRESTIGE_MAX_LEVEL) return 'NEXT LEVEL ENTERS MASTER'
  return summary.master ? `MASTER LEVEL ${summary.level + 1}` : `LEVEL ${summary.level + 1}`
}

function careerXpPercent(summary: ReturnType<typeof careerXpSummary>): number {
  if (summary.level >= summary.levelCap) return 100
  return Math.min(100, Math.max(0, (summary.xpIntoLevel / Math.max(1, summary.xpForNext)) * 100))
}

function CareerResults({
  report,
  onUpgrade,
  onDismiss,
}: {
  report: CareerMissionReport
  onUpgrade: () => void
  onDismiss?: () => void
}) {
  const lines = [
    { label: 'BATTLE VICTORY', value: report.xpBreakdown.victory },
    { label: 'CAREER OBJECTIVE', value: report.xpBreakdown.objectives },
    { label: 'BATTLE COMPLETION', value: report.xpBreakdown.completion },
    { label: 'REPLAY BONUS', value: report.xpBreakdown.repeat },
    { label: 'PRESTIGE BONUS', value: report.xpBreakdown.prestige },
  ].filter((line) => line.value > 0)
  const leveled = report.levelAfter > report.levelBefore
  return (
    <section className={`career-results ${report.success ? 'is-win' : 'is-loss'}`} aria-live="polite">
      <div className="career-results__head">
        <div>
          <span>PERFORMANCE RESULTS · {report.missionTitle}</span>
          <h2>{report.success ? 'SET WON' : report.winner === 'draw' ? 'SET DRAWN' : 'SET LOST'}</h2>
        </div>
        <div className="career-results__total">
          <span>TOTAL ARTIST XP</span>
          <b>+{report.xpGained.toLocaleString('en-US')}</b>
        </div>
        {onDismiss && <button className="link-btn" onClick={onDismiss}>DISMISS ×</button>}
      </div>
      <div className="career-results__body">
        <div className="career-results__xp">
          {lines.length ? lines.map((line) => (
            <div key={line.label}><span>{line.label}</span><b>+{line.value.toLocaleString('en-US')}</b></div>
          )) : <div><span>XP AWARDED</span><b>+0</b></div>}
          <div className="is-total"><span>TOTAL EARNED</span><b>+{report.xpGained.toLocaleString('en-US')} ARTIST XP</b></div>
        </div>
        <div className="career-results__rank">
          <span>{leveled ? 'LEVEL MILESTONE' : 'LEVEL'}</span>
          <b>{report.levelBefore} <i>→</i> {report.levelAfter}</b>
          <em>{report.apGained > 0 ? `AP AWARDED +${report.apGained}` : 'NO NEW AP'}</em>
          <small>{report.ovrBefore} OVR → {report.ovrAfter} OVR · {report.apAfter} AP AVAILABLE</small>
        </div>
        <div className="career-results__actions">
          <button className="btn btn--primary" onClick={onUpgrade} disabled={report.apAfter <= 0}>
            UPGRADE MY ARTIST →
          </button>
          <span>{report.apAfter > 0 ? `${report.apAfter} AP WAITING · 5 AP = +1 OVR` : 'AP COMES FROM FIRST CLEARS & CHAPTER BOSSES'}</span>
        </div>
      </div>
      {leveled && <div className="career-results__milestone">LEVEL MILESTONE · {report.levelAfter} REACHED</div>}
      <div className="career-results__objectives">
        {report.objectives.map((objective) => (
          <span key={objective.id} className={objective.done ? 'is-done' : ''}>
            {objective.done ? '✓' : '○'} {objective.label}
          </span>
        ))}
        {report.rewards.map((reward) => <span className="is-reward" key={reward}>✦ {reward}</span>)}
      </div>
    </section>
  )
}

function CareerSlots({
  slots,
  activeSlotId,
  onCreate,
  onSelect,
  onDelete,
}: {
  slots: CareerSlotSummary[]
  activeSlotId: string
  onCreate: (slotId: string) => void
  onSelect: (slotId: string) => void
  onDelete: (slotId: string) => void
}) {
  return (
    <div className="career-slot-grid">
      {slots.map((slot) => {
        const active = slot.id === activeSlotId
        return (
          <article key={slot.id} className={`career-slot${active ? ' is-active' : ''}${slot.empty ? ' is-empty' : ''}`}>
            <header>
              <span>SLOT {slot.number}</span>
              <i>{active ? 'ACTIVE' : slot.empty ? 'EMPTY' : 'SAVED'}</i>
            </header>
            <b>{slot.empty ? 'NEW CAREER' : slot.stageName}</b>
            {slot.empty ? (
              <p>Fresh slot. Create a local artist here.</p>
            ) : (
              <>
                <p>{slot.genre} · LEVEL {slot.level} · {slot.ovr} OVR · PRESTIGE {slot.prestige} · CH. {slot.chapter}</p>
                <small>UPDATED {new Date(slot.updatedAt).toLocaleDateString()}</small>
              </>
            )}
            <div className="career-slot__actions">
              {slot.empty ? (
                <button className="btn btn--primary btn--sm" onClick={() => onCreate(slot.id)}>CREATE HERE</button>
              ) : active ? (
                <button className="btn btn--ghost btn--sm" disabled>IN PLAY</button>
              ) : (
                <button className="btn btn--ghost btn--sm" onClick={() => onSelect(slot.id)}>SWITCH</button>
              )}
              {!slot.empty && (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    if (!window.confirm(`Delete slot ${slot.number} (${slot.stageName})?\n\nThe artist is permanently removed and slot ${slot.number} becomes a fresh empty save. Your other ${slots.length - 1} slots are untouched.`)) return
                    onDelete(slot.id)
                  }}
                >
                  DELETE
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function CareerTop({
  eyebrow,
  title,
  note,
  onBack,
  backLabel = '← MY ARTIST CAREER',
  actions,
}: {
  eyebrow: string
  title: string
  note: string
  onBack: () => void
  backLabel?: string
  actions?: ReactNode
}) {
  return (
    <header className="subpage__top career-top">
      <button className="link-btn" onClick={onBack}>
        {backLabel}
      </button>
      <span className="subpage__crumb">{eyebrow}</span>
      <div className="career-top__title">
        <b>{title}</b>
        <i>{note}</i>
      </div>
      <div className="subpage__actions">{actions}</div>
    </header>
  )
}

export function Career({
  settings,
  career,
  slots,
  activeSlotId,
  onSelectSlot,
  onDeleteSlot,
  report = null,
  onDismissReport,
  onCareerChange,
  onStartMission,
  onStartLocal,
  onDeck,
  onBack,
  onSettings,
  onReset,
}: CareerProps) {
  const [view, setView] = useState<CareerView>(career ? 'landing' : 'landing')
  const [wizardDraft, setWizardDraft] = useState<CareerState>(() => newCareerDraft())
  const [wizardStep, setWizardStep] = useState(0)
  const [pendingUpgrades, setPendingUpgrades] = useState<Partial<Record<CareerAttributeId, number>>>({})
  const [moveDraft, setMoveDraft] = useState<string[]>(career?.equippedMoves ?? [])
  const [badgeDraft, setBadgeDraft] = useState<BadgeId[]>(career?.equippedBadges ?? [])
  const [legacyMoveDraft, setLegacyMoveDraft] = useState('')
  const [legacyBadgeDraft, setLegacyBadgeDraft] = useState('')
  const [titleFilter, setTitleFilter] = useState<'climb' | 'master' | 'legend' | 'all'>('climb')
  const [presetDraftId, setPresetDraftId] = useState<CareerPresetId>(career?.presetId ?? 'male_01')
  const [selectedChapter, setSelectedChapter] = useState(career?.chapter ?? 1)
  const [notice, setNotice] = useState('')

  const beginCareerInSlot = (slotId: string) => {
    if (slotId !== activeSlotId) onSelectSlot(slotId)
    setWizardDraft(newCareerDraft())
    setWizardStep(0)
    setView('wizard')
  }

  const beginNewCareer = () => {
    const empty = slots.find((slot) => slot.empty)
    if (!empty) {
      setNotice('ALL 5 CAREER SLOTS ARE FULL · DELETE A SLOT IN SAVE / SETTINGS TO START FRESH')
      window.setTimeout(() => setNotice(''), 3200)
      return
    }
    beginCareerInSlot(empty.id)
  }

  const summary = career ? careerXpSummary(career) : null
  const chapters = useMemo(() => careerChapters(career?.genre ?? 'HIP-HOP'), [career?.genre])
  const activeChapter = career ? careerChapter(career.genre, Math.min(career.chapter, selectedChapter)) : chapters[0]
  const nextMission = career ? careerNextMission(career) : undefined
  const projected = career ? careerUpgradeCost(career, pendingUpgrades) : null

  const saveCareer = (next: CareerState, message = 'CAREER SAVED') => {
    onCareerChange(syncCareer(next))
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  if (view === 'wizard') {
    return (
      <CareerCreator
        draft={wizardDraft}
        setDraft={setWizardDraft}
        step={wizardStep}
        setStep={setWizardStep}
        onFinalize={(finalized) => {
          onCareerChange(finalized)
          setWizardDraft(finalized)
        }}
        onLaunch={(finalized) => {
          onCareerChange(finalized)
          onStartMission(careerChapters(finalized.genre)[0].missions[0])
        }}
        onCancel={() => setView('landing')}
      />
    )
  }

  if (!career) {
    return (
      <main className="subscreen career career--landing">
        <CareerTop
          eyebrow="MY ARTIST CAREER"
          title="FROM THE BASEMENT"
          note={`TO THE BILLBOARD · ${CAREER_TITLE}`}
          onBack={onBack}
        />
        <section className="career-landing">
          <div className="career-landing__poster">
            <span className="career-landing__stamp">CIKI · ORIGINAL CAMPAIGN</span>
            <h1>FROM THE<br /><em>BASEMENT</em><br />TO THE<br /><em>BILLBOARD</em></h1>
            <p>Create a local artist at Level 1 and 50 OVR. Earn Artist XP, spend AP, grow your attributes and take the personal card through ten Prestige runs to Prestige Legend.</p>
            <div className="career-landing__actions">
              <button className="btn btn--primary btn--wide" onClick={beginNewCareer}>
                NEW CAREER →
              </button>
              <button
                className="btn btn--ghost btn--wide"
                disabled={!slots.some((slot) => !slot.empty)}
                onClick={() => {
                  const saved = slots.find((slot) => !slot.empty)
                  if (saved) onSelectSlot(saved.id)
                }}
              >
                {slots.some((slot) => !slot.empty) ? 'CONTINUE SAVED CAREER' : 'CONTINUE CAREER · NO SAVE'}
              </button>
            </div>
            <div className="career-landing__rules">
                <span>10 CHAPTERS</span><span>30 MISSIONS</span><span>10 PRESTIGES</span><span>LEVEL 55 RUNS</span><span>LOCAL ONLY</span>
              </div>
          </div>
          <div className="career-landing__side">
            <div className="career-landing__panel">
              <span>MY ARTIST</span>
              <b>NO CARD YET</b>
              <p>Your personal artist will live here once you sign the first card.</p>
            </div>
            <div className="career-landing__panel">
              <span>CAREER PROGRESS</span>
              <b>PRESTIGE 0 · LEVEL 1</b>
              <p>Start at 50 OVR, climb from Level 1 to 55, then Prestige at 55.</p>
            </div>
            <div className="career-landing__panel">
              <span>CAREER SETTINGS</span>
              <b>GLOBAL AUDIO · REDUCED MOTION</b>
              <button className="link-btn" onClick={onSettings}>OPEN SETTINGS →</button>
            </div>
          </div>
        </section>
        <section className="career-slot-section">
          <div className="career-panel">
            <span className="kicker">CAREER SAVE SLOTS · {slots.filter((slot) => !slot.empty).length} / {slots.length}</span>
            <p className="career-note">Every slot is an independent local artist with its own level, OVR, story progress and element loadout. Create in an empty slot or switch back to a saved career. Deleting a slot clears that artist and leaves the slot ready for a fresh career.</p>
            <CareerSlots slots={slots} activeSlotId={activeSlotId} onCreate={beginCareerInSlot} onSelect={onSelectSlot} onDelete={onDeleteSlot} />
          </div>
        </section>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  const go = (next: CareerView) => {
    setView(next)
    if (next === 'moves') setMoveDraft(career.equippedMoves)
    if (next === 'badges') setBadgeDraft(career.equippedBadges)
    if (next === 'preset') setPresetDraftId(career.presetId)
    if (next === 'development') setPendingUpgrades({})
    if (next === 'missions') setSelectedChapter(career.chapter)
    if (next === 'legacy') {
      setLegacyMoveDraft('')
      setLegacyBadgeDraft('')
    }
  }

  const navigate = (next: CareerView) => {
    go(next)
  }

  const topBar = (title: string, note: string) => (
    <>
      <CareerTop
        eyebrow={CAREER_TITLE}
        title={title}
        note={note}
        backLabel={view === 'hub' ? '← MY ARTIST CAREER' : '← CAREER HUB'}
        onBack={() => (view === 'hub' ? setView('landing') : setView('hub'))}
        actions={view === 'hub' ? (
          <>
            <button className="btn btn--ghost btn--sm" onClick={onBack}>← MAIN MENU</button>
          </>
        ) : undefined}
      />
      <CareerNav current={view} onNavigate={navigate} />
    </>
  )

  if (view === 'landing') {
    return (
      <main className="subscreen career career--landing">
        <CareerTop
          eyebrow="MY ARTIST CAREER"
          title="FROM THE BASEMENT"
          note="TO THE BILLBOARD · LOCAL CAMPAIGN"
          onBack={onBack}
          backLabel="← MAIN MENU"
          actions={(
            <>
              <button className="btn btn--primary btn--sm" onClick={() => go('hub')}>ENTER CAREER →</button>
            </>
          )}
        />
        <CareerNav current={view} onNavigate={navigate} />
        {report && (
          <CareerResults
            report={report}
            onUpgrade={() => { onDismissReport?.(); go('development') }}
            onDismiss={onDismissReport}
          />
        )}
        <section className="career-landing">
          <div className="career-landing__poster">
            <span className="career-landing__stamp">CIKI · ORIGINAL CAMPAIGN</span>
            <h1>FROM THE<br /><em>BASEMENT</em><br />TO THE<br /><em>BILLBOARD</em></h1>
            <p>{career.stageName} · {career.genre} · Prestige {summary!.prestige} · Level {summary!.level} · {summary!.ovr} OVR · {summary!.reputation.title}. The next room is waiting.</p>
            <div className="career-landing__actions">
              <button className="btn btn--primary btn--wide" onClick={() => go('missions')}>CONTINUE STORY →</button>
              <button className="btn btn--ghost btn--wide" onClick={beginNewCareer}>NEW CAREER</button>
              <button className="btn btn--ghost btn--wide" onClick={() => go('artist')}>MY ARTIST</button>
              <button className="btn btn--ghost btn--wide" onClick={() => go('record')}>CAREER PROGRESS</button>
              <button className="btn btn--ghost btn--wide" onClick={() => go('settings')}>SAVE SLOTS / SETTINGS</button>
            </div>
            <div className="career-landing__rules">
              <span>{careerLevelLine(summary!)}</span><span>{summary!.ovr} OVR</span><span>PRESTIGE {summary!.prestige} / {CAREER_MAX_PRESTIGE}</span><span>CH. {String(career.chapter).padStart(2, '0')} / 10</span><span>{career.wins}W · {career.losses}L</span>
            </div>
          </div>
          <div className="career-landing__side">
            <CareerCardPanel career={career} />
            <div className="career-landing__panel career-reputation">
              <span>{summary!.reputation.title} · {career.ovr} OVR</span>
              <b>“{summary!.reputation.roomLine}”</b>
              <p>{summary!.reputation.blurb} · {summary!.reputation.unlock}</p>
            </div>
            <div className="career-landing__panel">
              <span>NEXT UP</span>
              <b>{nextMission?.title ?? 'CAMPAIGN COMPLETE'}</b>
              <p>{nextMission ? `${nextMission.venue.name} · ${nextMission.opponentName}` : 'Every chapter cleared. Keep playing for local XP, AP and replay rewards.'}</p>
              {nextMission && <button className="btn btn--primary btn--sm" onClick={() => onStartMission(nextMission)}>PLAY MISSION →</button>}
            </div>
            <div className="career-landing__panel">
              <span>CAREER SAVE SLOTS · {slots.filter((slot) => !slot.empty).length} / {slots.length}</span>
              <b>{slots.filter((slot) => !slot.empty).length} ARTISTS SAVED</b>
              <p>Keep up to {slots.length} independent local careers. New artists open in an empty slot; deleting a slot returns it to a fresh save.</p>
              <button className="btn btn--ghost btn--sm" onClick={() => go('settings')}>MANAGE SLOTS →</button>
            </div>
            <div className="career-landing__panel">
              <span>NEW CAREER</span>
              <p>A new career starts in the next empty slot. Your 50-artist collection and standard decks are never touched.</p>
            </div>
          </div>
        </section>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  if (view === 'hub') {
    return (
      <main className="subscreen career career--hub">
        {topBar('THE CAREER HUB', `${career.stageName} · ${career.genre} · ${career.ovr} OVR`)}
        <div className="career-hub">
          <section className="career-hub__hero">
            <CareerCardPanel career={career} />
            <div className="career-hub__stats">
              <StatBar label="ARTIST XP" value={Math.round(careerXpPercent(summary!))} max={100} />
              <div className="career-hub__numbers">
                <span><b>{summary!.level}</b><i>{summary!.master ? `MASTER / ${CAREER_MAX_LEVEL}` : `LEVEL / ${CAREER_PRESTIGE_MAX_LEVEL}`}</i></span>
                <span><b>{career.ovr}</b><i>OVR / {CAREER_MAX_OVR}</i></span>
                <span><b>{summary!.apAvailable}</b><i>AP AVAILABLE</i></span>
                <span><b>{summary!.prestige}</b><i>{summary!.master ? 'PRESTIGE MASTER' : `PRESTIGE / ${CAREER_MAX_PRESTIGE}`}</i></span>
              </div>
              <div className="career-hub__reputation">
                <span>{summary!.reputation.title}</span>
                <p>“{summary!.reputation.roomLine}”</p>
              </div>
              <div className="career-hub__progress">
                <span>CHAPTER {String(career.chapter).padStart(2, '0')} / 10</span>
                <i><em style={{ width: `${(career.chapter / 10) * 100}%` }} /></i>
                <small>{careerBadgeSlots(career.level)} badge slot{careerBadgeSlots(career.level) === 1 ? '' : 's'} · {summary!.xpBonus > 0 ? `+${Math.round(summary!.xpBonus * 100)}% PRESTIGE XP · ` : ''}CARD POWER ×{careerCardPower(summary!).toFixed(2)} · {summary!.level >= summary!.levelCap ? (summary!.master ? 'MASTER LADDER MAXED' : 'LEVEL 55 · PRESTIGE READY') : summary!.prestige >= CAREER_MAX_PRESTIGE && summary!.level === CAREER_PRESTIGE_MAX_LEVEL ? 'NEXT LEVEL ENTERS MASTER' : `${summary!.xpToNext.toLocaleString('en-US')} XP to ${careerNextLevelLabel(summary!)}`}</small>
              </div>
            </div>
          </section>

          {report && (
            <CareerResults
              report={report}
              onUpgrade={() => { onDismissReport?.(); go('development') }}
              onDismiss={onDismissReport}
            />
          )}

          <section className="career-hub__actions">
            {HUB_ACTIONS.map((action, index) => (
              <button key={`${action.label}-${index}`} className="career-action" onClick={() => go(action.view)}>
                <span>{String(index + 1).padStart(2, '0')} · {action.icon}</span>
                <b>{action.label}</b>
                <i>{action.note}</i>
              </button>
            ))}
          </section>

          <section className="career-hub__lower">
            <div className="career-hub__panel">
              <span>LATEST REWARDS</span>
              {career.lastRewards.length ? career.lastRewards.map((reward) => <b key={reward}>+ {reward}</b>) : <p>Complete a mission to fill the reward shelf.</p>}
            </div>
            <div className="career-hub__panel">
              <span>EQUIPPED MOVES</span>
              {careerMoves(career).filter((move) => career.equippedMoves.includes(move.id)).map((move) => (
                <b key={move.id}>{move.name} <i>{move.cost}H · {move.type.toUpperCase()}</i></b>
              ))}
            </div>
            <div className="career-hub__panel">
              <span>SHOW RULES</span>
              <b>26-CARD MIXTAPE</b>
              <p>Your personal card fills exactly one slot. Campaign and local CPU only. Online rooms reject this card.</p>
              <button className="btn btn--ghost btn--sm" onClick={onDeck}>OPEN MIXTAPE DECK</button>
            </div>
          </section>
          <div className="career-hub__local">
            <button className="btn btn--ghost" onClick={onStartLocal}>PLAY LOCAL CPU BATTLE · +{CAREER_LOCAL_AP_PER_WIN} AP/WIN</button>
            <button className="btn btn--ghost" onClick={() => go('settings')}>CAREER SETTINGS</button>
          </div>
          <p className="career-note">Local CPU wins pay {CAREER_LOCAL_AP_PER_WIN} AP each, up to {CAREER_LOCAL_AP_DAILY_CAP} AP per day. Career missions still pay AP on first clears and chapter bosses.</p>
        </div>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  if (view === 'artist') {
    const primaryElement = ELEMENT_META[career.element]
    const secondaryElement = career.secondaryElement ? ELEMENT_META[career.secondaryElement] : null
    return (
      <main className="subscreen career">
        {topBar('MY ARTIST', 'PERSONAL CARD · LOCAL ONLY')}
        <div className="career-artist">
          <CareerCardPanel career={career} />
          <section className="career-panel">
            <span className="kicker">IDENTITY</span>
            <div className="career-kv">
              <span>GENRE</span><b>{career.genre}</b>
              <span>ELEMENT</span><b>{primaryElement.icon} {primaryElement.label}{secondaryElement ? ` + ${secondaryElement.icon} ${secondaryElement.label}` : ''}</b>
              <span>HOME STATE</span><b>{career.region} · {careerHometown(career.hometownId).city}</b>
              <span>CREW</span><b>{career.crew}</b>
              <span>CAREER DIFFICULTY</span><b>{career.careerDifficulty}</b>
              <span>LEVEL</span><b>{careerLevelLine(summary!)}</b>
              <span>PRESTIGE</span><b>{summary!.prestige} / {CAREER_MAX_PRESTIGE}</b>
              <span>LEGACY TITLE</span><b>{summary!.title.label}</b>
              <span>REPUTATION</span><b>{summary!.reputation.title}</b>
              <span>ROOM READ</span><b>{summary!.reputation.roomLine}</b>
              <span>CARD POWER</span><b>×{careerCardPower(summary!).toFixed(2)}</b>
              <span>DEBUT</span><b>{careerArtist(career).debutAlbum}</b>
              <span>ENCORE</span><b>READY · TRANSFORMATION UNLOCKED</b>
            </div>
          </section>
          <section className="career-panel">
            <span className="kicker">ATTRIBUTE SHEET</span>
            <div className="career-attribute-list">
              {CAREER_ATTRIBUTES.map((attribute) => (
                <StatBar key={attribute.id} label={attribute.label} value={career.attributes[attribute.id]} max={CAREER_MAX_OVR} />
              ))}
            </div>
          </section>
          <section className="career-panel">
            <span className="kicker">EQUIPPED BADGES</span>
            {career.equippedBadges.length ? career.equippedBadges.map((badgeId) => {
              const badge = BADGE_BY_ID.get(badgeId)
              if (!badge) return null
              const tier = career.badges[badgeId]?.tier ?? 'locked'
              return <p className="career-badge-line" key={badgeId}><b>{badge.name} · {BADGE_TIER_META[tier].label}</b>{badge.effect(badgeTierPower(tier) || 1)}<em>{badge.activation} · {badge.limit}</em></p>
            }) : <p className="career-note">No badges equipped. Open BADGES from the hub.</p>}
          </section>
        </div>
      </main>
    )
  }

  if (view === 'elements') {
    const dual = careerDualElementUnlocked(career)
    const primary = ELEMENT_META[career.element]
    const secondary = career.secondaryElement ? ELEMENT_META[career.secondaryElement] : null
    const equipPrimary = (element: Element) => {
      if (element === career.element) return
      saveCareer(equipCareerElement(career, element, 'primary'), `${ELEMENT_META[element].label} EQUIPPED · PRIMARY`)
    }
    const equipSecondary = (element: Element) => {
      saveCareer(equipCareerElement(career, element, 'secondary'), `${ELEMENT_META[element].label} EQUIPPED · SECONDARY`)
    }
    const unlock = (element: Element) => {
      const next = unlockCareerElement(career, element)
      if (next === career) {
        setNotice(`NEED ${CAREER_ELEMENT_UNLOCK_COST} AP TO UNLOCK ${ELEMENT_META[element].label}`)
        window.setTimeout(() => setNotice(''), 2600)
        return
      }
      if (!window.confirm(`Unlock ${ELEMENT_META[element].label} permanently for ${CAREER_ELEMENT_UNLOCK_COST} AP?\n\nThis spends AP immediately and cannot be refunded. Unlocked elements survive Prestige.`)) return
      saveCareer(next, `${ELEMENT_META[element].label} UNLOCKED · -${CAREER_ELEMENT_UNLOCK_COST} AP`)
    }
    const clearSecond = () => {
      if (!secondary) return
      saveCareer(clearCareerSecondaryElement(career), 'SECOND ELEMENT UNEQUIPPED')
    }
    return (
      <main className="subscreen career career--elements">
        {topBar('ELEMENT LAB', `${primary.label}${secondary ? ` + ${secondary.label}` : ''} · ${summary!.ovr} OVR`)}
        <div className="career-elements">
          <section className="career-elements__hero">
            <div className="career-elements__slots">
              <article className="career-element-slot is-primary" style={{ '--element-color': primary.color } as CSSProperties}>
                <span>PRIMARY ELEMENT</span>
                <b>{primary.icon} {primary.label}</b>
                <p>{primary.theme}</p>
              </article>
              <article
                className={`career-element-slot ${secondary ? 'is-secondary' : 'is-locked'}`}
                style={{ '--element-color': secondary?.color ?? '#7a6e60' } as CSSProperties}
              >
                <span>SECOND ELEMENT</span>
                {secondary ? (
                  <>
                    <b>{secondary.icon} {secondary.label}</b>
                    <p>{secondary.theme}</p>
                  </>
                ) : (
                  <>
                    <b>{dual ? 'SLOT READY' : 'LOCKED'}</b>
                    <p>{dual ? 'Unlock another element to equip a second lane.' : `Dual elements unlock at ${CAREER_DUAL_ELEMENT_OVR} OVR.`}</p>
                  </>
                )}
              </article>
            </div>
            <div className="career-elements__summary">
              <span className="kicker">ELEMENT LOADOUT</span>
              <h2>{secondary ? 'DUAL ELEMENT' : 'ONE ELEMENT'}</h2>
              <p>The element you chose when creating this artist was free. Additional elements cost AP to unlock and stay with this career through every Prestige reset.</p>
              <div className="career-elements__ap">
                <span>AP AVAILABLE</span>
                <b>{summary!.apAvailable}</b>
                <i>{summary!.elementSpent} SPENT ON ELEMENTS · {CAREER_ELEMENT_UNLOCK_COST} AP PER UNLOCK</i>
              </div>
              <div className="career-elements__dual">
                <span>DUAL ELEMENTS</span>
                <b>{dual ? 'UNLOCKED' : `${CAREER_DUAL_ELEMENT_OVR} OVR`}</b>
                <i>{dual ? 'SECOND SLOT ACTIVE · BOTH ELEMENTS RIDE INTO BATTLE' : `${Math.max(0, CAREER_DUAL_ELEMENT_OVR - summary!.ovr)} OVR TO UNLOCK`}</i>
              </div>
              {secondary && <button className="btn btn--ghost btn--sm" onClick={clearSecond}>UNEQUIP SECOND ELEMENT</button>}
            </div>
          </section>

          <section className="career-elements__grid">
            {ELEMENT_ORDER.map((elementId) => {
              const meta = ELEMENT_META[elementId]
              const unlocked = career.unlockedElements.includes(elementId)
              const primaryOn = career.element === elementId
              const secondaryOn = career.secondaryElement === elementId
              return (
                <article
                  key={elementId}
                  className={`career-element-card ${unlocked ? 'is-unlocked' : 'is-locked'} ${primaryOn ? 'is-primary' : ''} ${secondaryOn ? 'is-secondary' : ''}`}
                  style={{ '--element-color': meta.color } as CSSProperties}
                >
                  <header>
                    <b>{meta.icon} {meta.label}</b>
                    <i>{unlocked ? 'UNLOCKED' : `${CAREER_ELEMENT_UNLOCK_COST} AP`}</i>
                  </header>
                  <p>{meta.theme}</p>
                  <div className="career-element-card__actions">
                    {!unlocked ? (
                      <button className="btn btn--primary btn--sm" onClick={() => unlock(elementId)} disabled={summary!.apAvailable < CAREER_ELEMENT_UNLOCK_COST}>
                        {summary!.apAvailable < CAREER_ELEMENT_UNLOCK_COST ? `NEED ${CAREER_ELEMENT_UNLOCK_COST} AP` : `UNLOCK · ${CAREER_ELEMENT_UNLOCK_COST} AP`}
                      </button>
                    ) : (
                      <>
                        <button className="btn btn--ghost btn--sm" onClick={() => equipPrimary(elementId)} disabled={primaryOn}>
                          {primaryOn ? 'PRIMARY EQUIPPED' : 'EQUIP PRIMARY'}
                        </button>
                        {dual && !primaryOn && (
                          <button className="btn btn--ghost btn--sm" onClick={() => equipSecondary(elementId)} disabled={secondaryOn}>
                            {secondaryOn ? 'SECONDARY EQUIPPED' : 'EQUIP SECONDARY'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </section>

          <p className="career-note">Only one element is equipped until OVR {CAREER_DUAL_ELEMENT_OVR}, when the second slot opens. The primary element drives your personal elemental cut; a secondary element gives your second elemental cut its own lane. Unlocked elements and element AP spending both survive Prestige.</p>
        </div>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  if (view === 'development') {
    const apply = () => {
      if (!projected || projected.ap <= 0) return
      if (!window.confirm(`Apply ${projected.ap} AP of attribute upgrades?\n\nThis spends AP immediately, raises OVR and cannot be undone.`)) return
      const next = applyCareerUpgrades(career, pendingUpgrades)
      saveCareer(next, `${projected.ap} AP SPENT · ${next.ovr} OVR`)
      setPendingUpgrades({})
    }
    const pendingAp = Object.values(pendingUpgrades).reduce((total, amount) => total + Math.max(0, amount ?? 0), 0)
    const apBudget = summary?.apAvailable ?? 0
    const apLeft = Math.max(0, apBudget - pendingAp)
    return (
      <main className="subscreen career">
        {topBar('ARTIST DEVELOPMENT', 'AP BUILDS ATTRIBUTES · ATTRIBUTES BUILD OVR · OVR PERSISTS THROUGH PRESTIGE')}
        <div className="career-dev">
          <section className="career-dev__identity">
            <div className="career-dev__portrait">
              <CareerPresetArt presetId={career.presetId} mode="full" />
            </div>
            <CareerCardPanel career={career} />
            <div className="career-dev__identity-copy">
              <span>{summary!.reputation.title}</span>
              <b>“{summary!.reputation.roomLine}”</b>
              <p>{summary!.reputation.blurb}</p>
              <i>NEXT MILESTONE · {summary!.reputation.unlock}</i>
            </div>
          </section>
          <section className="career-dev__hero">
            <div className="career-dev__ovr">
              <span>OVR</span><b>{career.ovr}</b><i>{summary!.reputation.title} · CAP {CAREER_MAX_OVR}</i>
            </div>
            <div className="career-dev__meter">
              <span>{careerLevelLine(summary!)} → {careerNextLevelLabel(summary!)}</span>
              <i><em style={{ width: `${careerXpPercent(summary!)}%` }} /></i>
              <b>{summary!.level >= summary!.levelCap ? (summary!.master ? `MASTER LADDER MAXED · ${summary!.apEarned.toLocaleString('en-US')} AP EARNED` : `LEVEL 55 / 55 · ${summary!.apEarned.toLocaleString('en-US')} AP EARNED · PRESTIGE READY`) : `${summary!.xpToNext.toLocaleString('en-US')} XP TO ${careerNextLevelLabel(summary!)} · AP FROM FIRST CLEARS & CHAPTER BOSSES`}</b>
            </div>
            <div className="career-dev__ap">
              <span>AVAILABLE AP</span><b>{apLeft}</b>              <i>{pendingAp ? `${pendingAp} PENDING · ` : ''}{summary!.apSpent} ATTRIBUTE AP · {summary!.elementSpent} ELEMENT AP / {summary!.apEarned} EARNED</i>
            </div>
          </section>
          <section className="career-dev__grid">
            {CAREER_ATTRIBUTES.map((attribute) => {
              const current = career.attributes[attribute.id]
              const add = pendingUpgrades[attribute.id] ?? 0
              const next = Math.min(CAREER_MAX_OVR, current + add)
              return (
                <div className="career-upgrade" key={attribute.id}>
                  <div className="career-upgrade__head">
                    <span>{attribute.label}</span>
                    <b>{current} <i>→</i> {next}</b>
                  </div>
                  <p>{attribute.description}</p>
                  <span className="career-upgrade__effect">{attribute.effect} +{next - current} · COST {add} AP</span>
                  <div className="career-upgrade__controls">
                    <button onClick={() => setPendingUpgrades((value) => ({ ...value, [attribute.id]: Math.max(0, add - 1) }))} disabled={add <= 0}>−</button>
                    <b>{add > 0 ? `+${add}` : 'NO CHANGE'}</b>
                    <button onClick={() => setPendingUpgrades((value) => ({ ...value, [attribute.id]: add + 1 }))} disabled={apLeft <= 0 || next >= CAREER_MAX_OVR}>+</button>
                  </div>
                </div>
              )
            })}
          </section>
          <section className="career-dev__summary">
            <div>
              <span>PROJECTED OVR</span>
              <b>{projected?.ovr ?? career.ovr}</b>
            </div>
            <div>
              <span>AP COST</span>
              <b>{projected?.ap ?? 0}</b>
            </div>
            <div>
              <span>PROJECTED TITLE</span>
              <b>{careerReputationForOvr(projected?.ovr ?? career.ovr).short}</b>
            </div>
            <div>
              <span>CARD POWER</span>
              <b>×{careerCardPower(projected ?? summary!).toFixed(2)}</b>
            </div>
            <div>
              <span>BADGE SLOTS</span>
              <b>{careerBadgeSlots(career.level)}</b>
            </div>
            <div className="career-dev__summary-actions">
              <button className="btn btn--ghost" onClick={() => setPendingUpgrades({})} disabled={!projected?.ap}>RESET UNSAVED</button>
              <button className="btn btn--primary" onClick={apply} disabled={!projected?.ap}>APPLY UPGRADES</button>
            </div>
          </section>
          <p className="career-note">AP comes from career progress, not level-ups: first clears award {CAREER_AP_PER_LEVEL} AP, chapter bosses award another 10 AP, and local CPU wins award {CAREER_LOCAL_AP_PER_WIN} AP up to {CAREER_LOCAL_AP_DAILY_CAP} per day. The {CAREER_MAX_AP} AP ceiling covers max OVR and every element unlock. Spend it in one attribute or split it across the set; every 5 AP spent adds +1 OVR. OVR starts at {CAREER_MIN_OVR}, caps at {CAREER_MAX_OVR}, and never resets when you Prestige.</p>
          <section className="career-dev__equipped">
            <div>
              <span>EQUIPPED MOVES</span>
              {careerMoves(career).filter((move) => career.equippedMoves.includes(move.id)).map((move) => (
                <b key={move.id}>{move.name} <i>{move.cost}H · {move.type.toUpperCase()}</i></b>
              ))}
            </div>
            <div>
              <span>EQUIPPED BADGES</span>
              {career.equippedBadges.length ? career.equippedBadges.map((badgeId) => {
                const badge = BADGE_BY_ID.get(badgeId)
                return badge ? <b key={badgeId}>{badge.name} <i>{badge.effect(1)}</i></b> : null
              }              ) : <p>No badges equipped. Slots open at levels 10, 20, 30, 40 and 55.</p>}
            </div>
            <div>
              <span>NEXT MILESTONE</span>
              <b>{summary!.level >= summary!.levelCap ? (summary!.master ? 'MASTER LADDER MAXED' : 'PRESTIGE READY · LEVEL 55') : careerNextLevelLabel(summary!)}</b>
              <p>{summary!.level >= summary!.levelCap ? (summary!.master ? 'Every Master level is complete.' : 'Prestige to begin the next run. OVR and AP stay with you.') : `${summary!.xpToNext.toLocaleString('en-US')} XP to ${careerNextLevelLabel(summary!)} · no AP from levels`}</p>
            </div>
          </section>
        </div>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  if (view === 'moves') {
    const catalog = careerMoveCatalog(career)
    const toggle = (id: string) => {
      setMoveDraft((current) => {
        if (current.includes(id)) return current.filter((moveId) => moveId !== id)
        if (current.length >= CAREER_MOVE_SLOTS) return current
        return [...current, id]
      })
    }
    return (
      <main className="subscreen career">
        {topBar('EQUIP MOVES', `3 ACTION SLOTS · ${moveDraft.length} EQUIPPED`)}
        <div className="career-moves">
          <div className="career-moves__slots">
            {Array.from({ length: CAREER_MOVE_SLOTS }).map((_, index) => {
              const move = catalog.find((item) => item.move.id === moveDraft[index])?.move
              return <div className={`career-move-slot ${move ? 'is-filled' : ''}`} key={index}><span>0{index + 1}</span>{move ? <b>{move.name}</b> : <i>OPEN ACTION SLOT</i>}</div>
            })}
          </div>
          <div className="career-move-grid">
            {catalog.map((entry, index) => {
              const { move, unlocked: available, unlockRank, special: isSpecial } = entry
              const on = moveDraft.includes(move.id)
              return (
                <button key={move.id} className={`career-move ${on ? 'is-on' : ''} ${!available ? 'is-locked' : ''}`} onClick={() => available && !isSpecial && toggle(move.id)} disabled={!available || isSpecial}>
                  <span>{isSpecial ? `LEVEL ${unlockRank} · SIGNATURE` : `LEVEL ${unlockRank} · SLOT ${index + 1}`}</span>
                  <b>{move.name}</b>
                  <i>{move.cost} HYPE · {move.type.toUpperCase()} · {move.target.toUpperCase()}</i>
                  <p>{move.description}</p>
                  <em>{move.power} POWER · {move.effects.map((effect) => `${effect.damage ? `DMG ${effect.damage}` : effect.heal ? `HEAL ${effect.heal}` : effect.shield ? `SHIELD ${effect.shield}` : effect.crowd ? `CROWD ${effect.crowd}` : ''}`).filter(Boolean).join(' · ') || 'UTILITY'}</em>
                  {!available && <strong>UNLOCKS AT LEVEL {unlockRank}</strong>}
                </button>
              )
            })}
          </div>
          <div className="career-step-actions">
            <button className="btn btn--ghost" onClick={() => setMoveDraft(defaultCareerLoadout(career))}>DEFAULT THREE</button>
            <button className="btn btn--ghost" onClick={() => setMoveDraft([])}>CLEAR</button>
            <button className="btn btn--primary" onClick={() => { const next = equipCareerMoves(career, moveDraft); saveCareer(next, 'LOADOUT SAVED'); setMoveDraft(next.equippedMoves) }} disabled={moveDraft.length === 0}>SAVE LOADOUT</button>
          </div>
          <p className="career-note">Your personal card uses the same three action slots and the same Hype economy as every standard artist. The signature move unlocks at level 55 and never occupies a slot. OVR and attributes scale the damage, healing, shields and element effects of these cuts.</p>
        </div>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  if (view === 'badges') {
    const slots = careerBadgeSlots(career.level)
    const showBadgeNotice = (message: string) => {
      setNotice(message)
      window.setTimeout(() => setNotice(''), 3200)
    }
    const toggle = (id: BadgeId) => {
      const record = career.badges[id]
      if (!record || record.tier === 'locked') {
        showBadgeNotice('THAT BADGE IS STILL LOCKED · EARN ITS MATCHING XP FIRST')
        return
      }
      if (slots === 0) {
        showBadgeNotice(`NO BADGE SLOTS YET · YOUR FIRST SLOT OPENS AT LEVEL ${CAREER_BADGE_SLOT_RANK[0]}`)
        return
      }
      const equipped = badgeDraft.includes(id)
      if (!equipped && badgeDraft.length >= slots) {
        showBadgeNotice(`ALL ${slots} BADGE SLOTS ARE FULL · REMOVE ONE BEFORE EQUIPPING ANOTHER`)
        return
      }
      const nextDraft = equipped ? badgeDraft.filter((badge) => badge !== id) : [...badgeDraft, id]
      const next = equipCareerBadges(career, nextDraft)
      setBadgeDraft(next.equippedBadges)
      saveCareer(next, equipped ? 'BADGE REMOVED' : 'BADGE EQUIPPED')
    }
    return (
      <main className="subscreen career">
        {topBar('BADGES', `${careerBadgeCount(career)} / ${BADGE_CATALOG.length} UNLOCKED · ${slots} SLOTS AT LEVEL ${career.level}`)}
        <div className="career-badges">
          <div className="career-badge-guide">
            <div>
              <span className="kicker">{slots === 0 ? 'BADGE SLOTS LOCKED' : 'EQUIP BADGES'}</span>
              <b>{slots === 0 ? `FIRST SLOT OPENS AT LEVEL ${CAREER_BADGE_SLOT_RANK[0]}` : `TAP AN UNLOCKED BADGE TO EQUIP · ${badgeDraft.length} OF ${slots} SLOTS USED`}</b>
            </div>
            <p>{slots === 0
              ? 'Keep clearing career missions to level up. Unlocked badges wait here until your first slot opens.'
              : `Changes save instantly. Tap an equipped badge to remove it. Slots open at levels ${CAREER_BADGE_SLOT_RANK.join(', ')}.`}</p>
          </div>
          <div className="career-badge-slots">
            {Array.from({ length: slots }).map((_, index) => {
              const badge = badgeDraft[index] ? BADGE_BY_ID.get(badgeDraft[index]) : undefined
              return <div className={`career-badge-slot ${badge ? 'is-filled' : ''}`} key={index}><span>SLOT 0{index + 1}</span><b>{badge ? badge.name : 'OPEN'}</b>{!badge && <i>TAP A BADGE BELOW</i>}</div>
            })}
          </div>
          <div className="career-badge-grid">
            {BADGE_CATALOG.map((badge) => {
              const record = career.badges[badge.id]
              const tier = record?.tier ?? 'locked'
              const owned = tier !== 'locked'
              const on = badgeDraft.includes(badge.id)
              return (
                <button
                  key={badge.id}
                  className={`career-badge-card ${on ? 'is-on' : ''} ${owned ? '' : 'is-locked'}`}
                  onClick={() => toggle(badge.id)}
                  disabled={!owned}
                  style={{
                    '--badge-accent': badge.accent,
                    '--tier-color': BADGE_TIER_META[tier].color,
                  } as CSSProperties}
                >
                  <span>{badge.tag} · {owned ? `${BADGE_TIER_META[tier].label} · TIER ${badgeTierPower(tier)}` : 'LOCKED'}</span>
                  <b>{badge.icon} {badge.name}</b>
                  <p>{badge.requirement}</p>
                  <small>{badge.activation} · {badge.limit}</small>
                  <em>{badge.effect(badgeTierPower(tier) || 1)}</em>
                  <strong className="career-badge-card__cta">
                    {owned
                      ? on
                        ? 'EQUIPPED · TAP TO REMOVE'
                        : slots === 0
                          ? `SLOT OPENS AT LEVEL ${CAREER_BADGE_SLOT_RANK[0]}`
                          : badgeDraft.length >= slots
                            ? 'SLOTS FULL · REMOVE ONE FIRST'
                            : 'TAP TO EQUIP'
                      : 'LOCKED'}
                  </strong>
                  <i>{owned
                    ? record?.tier === 'diamond' ? 'DIAMOND · MAXED' : record ? `${badgeXpToNext(record).toLocaleString('en-US')} XP TO NEXT TIER` : 'UNLOCKED'
                    : `UNLOCK · ${badge.unlock}`}</i>
                </button>
              )
            })}
          </div>
          <div className="career-step-actions">
            <button
              className="btn btn--ghost"
              onClick={() => {
                const next = equipCareerBadges(career, [])
                setBadgeDraft([])
                saveCareer(next, 'ALL BADGES REMOVED')
              }}
              disabled={!badgeDraft.length}
            >
              REMOVE ALL
            </button>
            <button className="btn btn--primary" onClick={() => setView('hub')}>DONE · BACK TO HUB</button>
          </div>
          <p className="career-note">Tap an unlocked badge above to equip it; changes save instantly. Career badges are the same ten programs, tiers and battle effects used in every mode. Story clears unlock a Plastic copy, career battles add tier XP, and levels 10, 20, 30, 40 and 55 open five equip slots. Prestige relocks non-permanent badges and resets their tier progress; Permanent Unlocks survive but return at Plastic. Badges never grant extra attacks or bypass Hype.</p>
        </div>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  if (view === 'preset') {
    const selected = careerPreset(presetDraftId)
    return (
      <main className="subscreen career">
        {topBar('CHANGE ARTIST MODEL', '6 MALE · 6 FEMALE · SAME CARD · SAME PROGRESS')}
        <div className="career-preset-change">
          <section className="career-preset-change__picker">
            <CareerPresetPicker
              value={presetDraftId}
              onChange={setPresetDraftId}
            />
          </section>
          <section className="career-preset-change__preview">
            <div className="career-creator-stage">
              <div className="career-creator-stage__floor" />
              <div className="career-creator-stage__portrait">
                <CareerPresetArt presetId={presetDraftId} mode="full" />
              </div>
              <span className="career-creator-stage__tag">{selected.label} · {career.genre} · {career.ovr} OVR</span>
            </div>
            <div className="career-preset-change__summary">
              <div><span>MODEL</span><b>{selected.label}</b></div>
              <div><span>STARTING LEVEL</span><b>1</b></div>
              <div><span>STARTING OVR</span><b>50</b></div>
              <div><span>ARTWORK</span><b>READY</b></div>
            </div>
            <p className="career-note">Changing the artist model does not change the artist ID, stage name, genre, hometown, OVR, XP, AP, missions, moves, badges or deck. It updates the personal card portrait everywhere.</p>
            <div className="career-step-actions">
              <button className="btn btn--ghost" onClick={() => setView('artist')}>CANCEL</button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  saveCareer(updateCareerPreset(career, presetDraftId), 'ARTIST MODEL SAVED')
                  setView('artist')
                }}
              >
                SAVE ARTIST MODEL
              </button>
            </div>
          </section>
        </div>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  if (view === 'missions') {
    return (
      <main className="subscreen career">
        {topBar('CAREER MISSIONS', `${careerCompletedMissions(career)} / 30 CLEARED · CHAPTER ${String(career.chapter).padStart(2, '0')}`)}
        <div className="career-missions">
          <aside className="career-chapters">
            {chapters.map((chapter) => {
              const progress = careerChapterProgress(career, chapter)
              return (
                <button key={chapter.number} className={selectedChapter === chapter.number ? 'is-on' : ''} disabled={chapter.number > career.chapter} onClick={() => setSelectedChapter(chapter.number)}>
                  <span>CH. {String(chapter.number).padStart(2, '0')}</span>
                  <b>{chapter.title}</b>
                  <i>{progress}/3 CLEARED</i>
                </button>
              )
            })}
          </aside>
          <section className="career-mission-list">
            <div className="career-chapter-head">
              <span>CHAPTER {String(activeChapter.number).padStart(2, '0')} · {activeChapter.label}</span>
              <h1>{activeChapter.title}</h1>
              <p>{activeChapter.synopsis}</p>
              <div><span>{activeChapter.venue.name}</span><span>{activeChapter.producer}</span><span>{activeChapter.promoter}</span></div>
            </div>
            {activeChapter.missions.map((mission) => {
              const status = careerMissionStatus(career, mission)
              const record = career.missions[mission.id]
              return (
                <article className={`career-mission ${status}`} key={mission.id}>
                  <div className="career-mission__head">
                    <span>{status === 'complete' ? 'CLEARED' : status === 'available' ? 'AVAILABLE' : 'LOCKED'} · {mission.venue.name}</span>
                    <b>{mission.title}</b>
                    <i>{mission.subtitle} · {mission.opponentName}</i>
                  </div>
                  <div className="career-mission__body">
                    <p>{mission.story[1]?.text}</p>
                    <ul>
                      {mission.objectives.map((objective) => <li key={objective.id}>{objective.label}</li>)}
                    </ul>
                    <div className="career-mission__rewards">
                      <span>{mission.rewardXp.toLocaleString('en-US')} XP</span>
                      {mission.rewardBadge && <span>BADGE · {BADGE_BY_ID.get(mission.rewardBadge)?.name ?? mission.rewardBadge}</span>}
                      {record?.clears ? <span>REPLAY {Math.min(3, record.repeats)}/3 · 25% XP</span> : null}
                    </div>
                  </div>                  <button className="btn btn--primary btn--sm" disabled={status === 'locked'} onClick={() => onStartMission(mission)}>
                    {status === 'complete' ? 'REPLAY MISSION' : status === 'available' ? 'START MISSION →' : 'COMPLETE PREVIOUS MISSION'}
                  </button>
                </article>
              )
            })}
          </section>
        </div>
      </main>
    )
  }

  if (view === 'record') {
    return (
      <main className="subscreen career">
        {topBar('CAREER RECORD', 'THE RECEIPTS · LOCAL CAMPAIGN')}
        <div className="career-record">
          <div className="career-record__big">
            <span>RECORD</span>
            <b>{career.wins}W · {career.losses}L · {career.draws}D</b>
            <i>{careerWinRate(career)}% WIN RATE</i>
          </div>
          <div className="career-record__grid">
            <div><span>CHAPTER</span><b>{career.chapter} / 10</b></div>
            <div><span>MISSIONS CLEARED</span><b>{careerCompletedMissions(career)} / 30</b></div>
            <div><span>LEVEL</span><b>{summary!.level} / {summary!.master ? CAREER_MAX_LEVEL : CAREER_PRESTIGE_MAX_LEVEL}</b></div>
            <div><span>PRESTIGE</span><b>{summary!.prestige} / {CAREER_MAX_PRESTIGE}</b></div>
            <div><span>OVR</span><b>{career.ovr} / {CAREER_MAX_OVR}</b></div>
            <div><span>REPUTATION</span><b>{summary!.reputation.short}</b></div>
            <div><span>AP EARNED</span><b>{summary!.apEarned}</b></div>
            <div><span>AP SPENT</span><b>{summary!.apSpent + summary!.elementSpent}</b></div>
            <div><span>BADGES</span><b>{careerBadgeCount(career)} / {BADGE_CATALOG.length}</b></div>
            <div><span>DECK</span><b>{careerDeckLegal(career.deck, career.artistId) ? 'LEGAL 26' : 'NEEDS FIX'}</b></div>
          </div>
          <div className="career-record__chapters">
            {chapters.map((chapter) => (
              <div key={chapter.number} className={chapter.number <= career.chapter ? 'is-open' : ''}>
                <span>CH. {String(chapter.number).padStart(2, '0')}</span>
                <b>{chapter.title}</b>
                <i>{careerChapterProgress(career, chapter)}/3</i>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (view === 'legacy') {
    const unlockedTitles = careerUnlockedTitles(career)
    const activeTitle = summary!.title
    const ready = careerPrestigeReady(career)
    const atMaxPrestige = career.prestige >= CAREER_MAX_PRESTIGE
    const legendComplete = atMaxPrestige && summary!.level >= CAREER_PRESTIGE_MAX_LEVEL
    const availableMoves = careerMoveCatalog(career).filter((entry) => !entry.permanent && entry.unlockRank > 1)
    const availableBadges = BADGE_CATALOG.filter((badge) => !career.legacyUnlocks.includes(`badge:${badge.id}`))
    const selectedMove = availableMoves.find((entry) => (entry.special ? 'move:special' : `move:${entry.index}`) === legacyMoveDraft)
    const selectedBadge = availableBadges.find((badge) => `badge:${badge.id}` === legacyBadgeDraft)
    const canSpendToken = Boolean(career.prestigeTokens > 0 && selectedMove && selectedBadge)
    const titleFilters: Array<{ id: 'climb' | 'master' | 'legend' | 'all'; label: string; count: number }> = [
      { id: 'climb', label: 'THE CLIMB', count: CAREER_CLIMB_TITLES.length },
      { id: 'master', label: 'MASTER ENTRY', count: CAREER_MASTER_ENTRY_TITLES.length },
      { id: 'legend', label: 'LEGEND GRIND', count: CAREER_LEGEND_TITLES.length },
      { id: 'all', label: 'ALL TITLES', count: CAREER_TITLE_CATALOG.length - 1 },
    ]
    const visibleTitles = CAREER_TITLE_CATALOG.filter((title) =>
      titleFilter === 'all' ? true : title.source === titleFilter,
    )
    const colors = [...new Map(unlockedTitles.map((title) => [title.color.toLowerCase(), title.color])).values()]
    const spend = () => {
      if (career.prestigeTokens <= 0 || !selectedMove || !selectedBadge) return
      const next = spendCareerToken(career, legacyMoveDraft, legacyBadgeDraft)
      if (next === career) return
      saveCareer(next, `PERMANENT UNLOCKS · ${selectedMove.move.name} + ${selectedBadge.name}`)
      setLegacyMoveDraft('')
      setLegacyBadgeDraft('')
    }
    return (
      <main className="subscreen career career--legacy">
        {topBar('PRESTIGE / LEGACY', `${careerLevelLine(summary!)} · ${summary!.prestige}/${CAREER_MAX_PRESTIGE} PRESTIGES`)}
        <div className="career-legacy">
          <section className="career-legacy__hero">
            <div>
              <span className="kicker">{summary!.master ? 'MASTER LEVEL' : 'PRESTIGE LEVEL'}</span>
              <b>{summary!.level}<i>/ {summary!.master ? CAREER_MAX_LEVEL : CAREER_PRESTIGE_MAX_LEVEL}</i></b>
              <p>{activeTitle.label} · {summary!.prestige > 0 ? `+${Math.round(CAREER_PRESTIGE_XP_BONUS * 100)}% Prestige XP` : 'No Prestige XP bonus yet'}</p>
            </div>
            <div>
              <span className="kicker">PRESTIGE</span>
              <b>{summary!.prestige}<i>/ {CAREER_MAX_PRESTIGE}</i></b>
              <p>{summary!.master ? 'PRESTIGE MASTER · Master ladder active' : legendComplete ? 'PRESTIGE LEGEND · next level enters Master' : atMaxPrestige ? `PRESTIGE 10 · reach level ${CAREER_PRESTIGE_MAX_LEVEL} to finish the legend run.` : ready ? 'Level 55 reached. Prestige is available.' : `Reach level ${CAREER_PRESTIGE_MAX_LEVEL} to Prestige.`}</p>
            </div>
            <div>
              <span className="kicker">PERMANENT TOKENS</span>
              <b>{career.prestigeTokens}<i> UNSPENT</i></b>
              <p>One token is earned every Prestige. Each token permanently keeps one move and one badge.</p>
            </div>
          </section>

          <section className="career-legacy__panel is-prestige">
            <div>
              <span className="kicker">OPTIONAL PRESTIGE</span>
              <h2>{summary!.master ? 'PRESTIGE MASTER' : legendComplete ? 'PRESTIGE LEGEND' : atMaxPrestige ? 'FINISH PRESTIGE 10' : ready ? 'BEGIN THE NEXT RUN' : 'THE NEXT LADDER'}</h2>
              <p>Prestige resets your level and relocks every non-permanent move and badge. OVR, AP, attributes, campaign progress, records, Legacy titles, Permanent Unlocks and Prime cosmetics stay with you. Each Prestige grants one token for one permanent move and one permanent badge. Permanent badges return at Plastic and must be upgraded again. Ten full Prestiges unlock Prestige Legend; the next level after that begins the Master ladder at level 56.</p>
            </div>
            <div className="career-legacy__prestige-action">
              <span>CURRENT BONUS</span>
              <b>+{Math.round(CAREER_PRESTIGE_XP_BONUS * 100)}% XP</b>
              <button
                className="btn btn--primary"
                disabled={!ready || atMaxPrestige}
                onClick={() => {
                  if (!window.confirm(`Prestige ${career.prestige + 1}? All non-permanent move and badge unlocks reset. OVR, AP, attributes and Permanent Unlocks are kept. You will earn one token for one move and one badge.`)) return
                  saveCareer(prestigeCareer(career), `PRESTIGE ${career.prestige + 1} · PERMANENT UNLOCK TOKEN +1`)
                  setLegacyMoveDraft('')
                  setLegacyBadgeDraft('')
                }}
              >
                {summary!.master ? `MASTER LEVEL ${summary!.level} / ${CAREER_MAX_LEVEL}` : legendComplete ? 'NEXT LEVEL ENTERS MASTER' : ready ? `PRESTIGE ${career.prestige + 1} NOW →` : `REACH LEVEL ${CAREER_PRESTIGE_MAX_LEVEL} · ${summary!.level}/${CAREER_PRESTIGE_MAX_LEVEL}`}
              </button>
              <small>{CAREER_MAX_PRESTIGE} full Prestiges · {summary!.master ? 'Prestige Master' : legendComplete ? 'Prestige Legend complete' : `${career.prestige} / ${CAREER_MAX_PRESTIGE} resets`}</small>
            </div>
          </section>

          <section className="career-legacy__panel">
            <span className="kicker">LEGACY CUSTOMIZATION · {CAREER_TITLE_CATALOG.length - 1} CARD TITLES</span>
            <p>Change your active card title and level color at any time. Every title and color you have reached remains unlocked through future resets. Switch between the Prestige climb, the Master entry bundle and the long Legend grind.</p>
            <div className="career-title-filters" role="tablist" aria-label="Card title category">
              {titleFilters.map((filter) => (
                <button
                  key={filter.id}
                  className={titleFilter === filter.id ? 'is-on' : ''}
                  onClick={() => setTitleFilter(filter.id)}
                  role="tab"
                  aria-selected={titleFilter === filter.id}
                >
                  {filter.label}<b>{filter.count}</b>
                </button>
              ))}
            </div>
            <div className="career-legacy__titles">
              {visibleTitles.map((title) => {
                const unlocked = unlockedTitles.some((entry) => entry.id === title.id)
                const active = activeTitle.id === title.id
                return (
                  <button
                    key={title.id}
                    className={`${active ? 'is-on' : ''} ${title.animated ? 'is-animated' : ''}`}
                    style={{ '--title-color': title.color } as CSSProperties}
                    disabled={!unlocked}
                    onClick={() => saveCareer(setCareerLegacyStyle(career, title.id, career.activeColor), `${title.label} EQUIPPED`)}
                  >
                    <b>{title.label}</b>
                    <i>{careerTitleUnlockLabel(title)}</i>
                  </button>
                )
              })}
            </div>
            <div className="career-legacy__colors">
              <span>LEVEL COLOR</span>
              {colors.map((color) => (
                <button
                  key={color}
                  className={career.activeColor.toLowerCase() === color.toLowerCase() ? 'is-on' : ''}
                  style={{ '--swatch': color } as CSSProperties}
                  aria-label={`Use ${color} level color`}
                  onClick={() => saveCareer(setCareerLegacyStyle(career, activeTitle.id, color), 'LEVEL COLOR SAVED')}
                >
                  <i />
                </button>
              ))}
            </div>
          </section>

          <section className="career-legacy__panel">
            <span className="kicker">PERMANENT UNLOCK TOKENS · 1 MOVE + 1 BADGE</span>
            <p>Each token keeps one move and one badge permanently unlocked. Select both, then spend the token. Permanent badges return at Plastic after a Prestige reset; their tier XP must be earned again.</p>
            {career.prestigeTokens <= 0 ? (
              <div className="career-note">No tokens available. Prestige at level 55 to earn one.</div>
            ) : (
              <>
                <div className="career-token-grid">
                  {availableMoves.map((entry) => {
                    const key = entry.special ? 'move:special' : `move:${entry.index}`
                    return (
                      <button
                        key={`move-${entry.index}`}
                        className={legacyMoveDraft === key ? 'is-on' : ''}
                        aria-pressed={legacyMoveDraft === key}
                        onClick={() => setLegacyMoveDraft(legacyMoveDraft === key ? '' : key)}
                      >
                        <span>MOVE · LEVEL {entry.unlockRank}</span>
                        <b>{entry.special ? 'SIGNATURE CUT' : entry.move.name}</b>
                        <i>{entry.unlocked ? 'UNLOCKED · KEEP PERMANENT' : 'LOCKED · KEEP PERMANENT'}</i>
                      </button>
                    )
                  })}
                  {availableBadges.map((badge) => {
                    const tier = career.badges[badge.id]?.tier ?? 'locked'
                    const key = `badge:${badge.id}`
                    return (
                      <button
                        key={key}
                        className={legacyBadgeDraft === key ? 'is-on' : ''}
                        aria-pressed={legacyBadgeDraft === key}
                        onClick={() => setLegacyBadgeDraft(legacyBadgeDraft === key ? '' : key)}
                      >
                        <span>BADGE · {tier === 'locked' ? 'LOCKED' : BADGE_TIER_META[tier].label}</span>
                        <b>{badge.icon} {badge.name}</b>
                        <i>{tier === 'locked' ? 'LOCKED · KEEP PERMANENT' : 'UNLOCKED · KEEP PERMANENT'}</i>
                      </button>
                    )
                  })}
                </div>
                <div className="career-step-actions">
                  <button className="btn btn--primary" onClick={spend} disabled={!canSpendToken}>
                    {canSpendToken ? 'SPEND TOKEN · 1 MOVE + 1 BADGE' : 'SELECT ONE MOVE AND ONE BADGE'}
                  </button>
                </div>
                {(!availableMoves.length || !availableBadges.length) && (
                  <div className="career-note">
                    {availableMoves.length || availableBadges.length
                      ? 'A token needs one non-permanent move and one non-permanent badge.'
                      : 'Every move and badge in the catalog is already permanently unlocked.'}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="career-legacy__panel">
            <span className="kicker">CARD TITLE DISTRIBUTION · LEGACY UNLOCKS</span>
            <div className="career-legacy__ladder">
              <div className="is-open" style={{ '--title-color': '#f4c84e' } as CSSProperties}>
                <span>THE CLIMB</span>
                <b>{CAREER_CLIMB_TITLES.length} TITLES</b>
                <i>5 EACH PRESTIGE · LEVELS 10 / 20 / 30 / 40 / 55</i>
              </div>
              <div className="is-open" style={{ '--title-color': '#56e0ff' } as CSSProperties}>
                <span>MASTER ENTRY</span>
                <b>{CAREER_MASTER_ENTRY_TITLES.length} TITLES</b>
                <i>PRESTIGE {CAREER_MAX_PRESTIGE} · LEVEL 56 ENTRY BUNDLE</i>
              </div>
              <div className="is-open" style={{ '--title-color': '#ff3d8b' } as CSSProperties}>
                <span>THE LEGEND GRIND</span>
                <b>{CAREER_LEGEND_TITLES.length} TITLES</b>
                <i>5 EVERY 100 LEVELS · LEVEL 100–1,000</i>
              </div>
            </div>
            <p className="career-note">{unlockedTitles.filter((title) => title.source !== 'default').length} / {CAREER_TITLE_CATALOG.length - 1} card titles unlocked. Equip any unlocked title here, then choose one on your online player card. Ten full Prestiges reach Prestige Legend at {CAREER_XP_TO_LEGEND.toLocaleString('en-US')} total XP. OVR remains a separate {CAREER_MIN_OVR}–{CAREER_MAX_OVR} score and is never reset by Prestige.</p>
          </section>
        </div>
        {notice && <div className="toast">{notice}</div>}
      </main>
    )
  }

  return (
    <main className="subscreen career">
      {topBar('SAVE / SETTINGS', 'LOCAL CAREER DATA · VERSIONED')}
      <div className="career-settings">
        <section className="career-panel career-panel--wide">
          <span className="kicker">CAREER SAVE SLOTS · {slots.filter((slot) => !slot.empty).length} / {slots.length}</span>
          <p className="career-note">Switching slots saves the current career first. Each slot keeps its own artist, level, story progress, badges and elements. Create in an empty slot, switch to a saved one, or delete a slot to return it to a fresh career.</p>
          <CareerSlots slots={slots} activeSlotId={activeSlotId} onCreate={beginCareerInSlot} onSelect={onSelectSlot} onDelete={onDeleteSlot} />
        </section>
        <section className="career-panel">
          <span className="kicker">SAVE STATUS</span>
          <p className="career-note">Career v{career.version} saves automatically after every mission and change, with one previous valid backup. The active slot is written on every change. Existing collection and standard decks are separate.</p>
          <div className="career-kv">
            <span>ARTIST ID</span><b>{career.artistId}</b>
            <span>CREATED</span><b>{new Date(career.createdAt).toLocaleDateString()}</b>
            <span>LAST SAVED</span><b>{new Date(career.updatedAt).toLocaleString()}</b>
            <span>DECK</span><b>{career.deck.length}/26 · {careerDeckLegal(career.deck, career.artistId) ? 'LEGAL' : 'INVALID'}</b>
          </div>
          <div className="career-step-actions">
            <button className="btn btn--primary" onClick={() => saveCareer(career, 'CAREER SAVED')}>SAVE NOW</button>
            <button className="btn btn--ghost" onClick={onDeck}>OPEN MIXTAPE DECK</button>
            <button className="btn btn--ghost" onClick={onSettings}>GLOBAL SETTINGS</button>
          </div>
        </section>
        <section className="career-panel">
          <span className="kicker">CAREER DIFFICULTY &amp; CREW</span>
          <p className="career-note">Career difficulty is independent from the global show difficulty. Every mission uses this setting. Crew changes Feature Verse chemistry and the roster used by THE HOMETEAM starter deck.</p>
          <div className="career-difficulty-grid">
            {DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty.id}
                className={career.careerDifficulty === difficulty.id ? 'is-on' : ''}
                onClick={() => saveCareer(updateCareerIdentity(career, { careerDifficulty: difficulty.id }), `${difficulty.label} DIFFICULTY SAVED`)}
              >
                <b>{difficulty.label}</b>
                <i>{difficulty.note}</i>
              </button>
            ))}
          </div>
          <div className="career-crew-grid">
            {CAREER_CREWS.map((crew) => (
              <button
                key={crew}
                className={career.crew === crew ? 'is-on' : ''}
                onClick={() => saveCareer(updateCareerIdentity(career, { crew }), `${crew} AFFILIATION SAVED`)}
              >
                {crew}
              </button>
            ))}
          </div>
          <p className="career-note">Starting AP: {CAREER_STARTING_AP}. AP comes from first clears (+{CAREER_AP_PER_LEVEL}), chapter bosses (+10), and local CPU wins (+{CAREER_LOCAL_AP_PER_WIN}, up to {CAREER_LOCAL_AP_DAILY_CAP} per day). Spend it in one attribute or split it across several. Prestige resets only the level, move set and badge set; OVR, AP and attributes stay, along with Legacy titles and permanent unlocks.</p>
        </section>
        <section className="career-panel">
          <span className="kicker">LOCAL-ONLY NOTICE</span>
          <p className="career-note">Your personal artist is a single-player object. It never enters online rooms, festivals, trading, auction, lending or deck exports. Online validation rejects the reserved ID prefix even if the deck is edited by hand.</p>
          <div className="career-policy">
            <span>✓ CAREER BATTLES</span><span>✓ LOCAL CPU</span><span>✕ ONLINE</span><span>✕ FESTIVAL</span>
          </div>
        </section>
        <section className="career-panel career-danger">
          <span className="kicker">DELETE ACTIVE SLOT</span>
          <p>Deleting slot {slots.find((slot) => slot.id === activeSlotId)?.number ?? 1} removes this local artist and its campaign progress. The slot becomes empty and ready for a fresh career. Other slots, the 50-artist collection and standard decks stay intact.</p>
          <button
            className="btn btn--ghost"
            onClick={() => {
              const active = slots.find((slot) => slot.id === activeSlotId)
              if (window.confirm(`Delete slot ${active?.number ?? 1} (${career.stageName})?\n\nThis permanently clears the artist and leaves the slot ready for a fresh career.`)) onReset()
            }}
          >
            DELETE ACTIVE SLOT
          </button>
        </section>
        <section className="career-panel">
          <span className="kicker">AUDIO &amp; MOTION</span>
          <div className="career-kv">
            <span>THEME</span><b>{settings.theme.toUpperCase()}</b>
            <span>DIFFICULTY</span><b>{settings.difficulty}</b>
            <span>MUSIC</span><b>{Math.round(settings.musicVolume * 100)}%</b>
            <span>SFX</span><b>{Math.round(settings.sfxVolume * 100)}%</b>
            <span>REDUCED MOTION</span><b>{settings.reducedMotion ? 'ON' : 'OFF'}</b>
          </div>
        </section>
      </div>
      {notice && <div className="toast">{notice}</div>}
    </main>
  )
}
