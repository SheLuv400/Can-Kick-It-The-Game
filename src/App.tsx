import { useEffect, useState } from 'react'
import type { Difficulty, Settings, TeamProgress, ThemeId } from './game/types'
import { containsPersonalArtist, loadSettings, saveSettings, validDeck, validLineup } from './game/settings'
import {
  awardLocalCareerXp,
  careerActiveSlot,
  careerBattleSettings,
  careerSlotSummaries,
  deleteCareerSlot,
  loadCareer,
  registerCareerRuntime,
  resolveCareerMission,
  saveCareer,
  selectCareerSlot,
  unregisterCareerRuntime,
  type CareerMission,
  type CareerMissionReport,
  type CareerSlotSummary,
  type CareerState,
} from './game/career'
import { canClaimMission, MISSIONS } from './game/ultimate'
import { awardArtistXp } from './game/moves'
import {
  applyBadgeUpdates,
  awardBadgeXp,
  badgeProgramSummary,
  sanitizeBadgeLoadout,
  type BadgeUnlockNotice,
} from './game/badges'
import {
  advanceCharts,
  applyChartBoost,
  applyChartImpact,
  loadCharts,
  saveCharts,
  type ChartState,
} from './game/charts'
import {
  advanceLabelWeek,
  dropArtist,
  loadLabel,
  resolveCrisis,
  reviewExpense,
  saveLabel,
  signArtist,
  signingFee,
  startAlbum,
  type LabelState,
} from './game/label'
import { MainMenu } from './screens/MainMenu'
import { Battle, type BattlePerformance } from './screens/Battle'
import { Circuit } from './screens/Circuit'
import { DeckBuilder } from './screens/DeckBuilder'
import { Collection } from './screens/Collection'
import { DesignLab } from './screens/DesignLab'
import { UltimateTeam } from './screens/UltimateTeam'
import { Charts } from './screens/Charts'
import { LabelOffice } from './screens/LabelOffice'
import { RulesModal } from './components/RulesModal'
import { SettingsModal } from './components/SettingsModal'
import { AccountModal } from './components/AccountModal'
import { UpdatesModal } from './components/UpdatesModal'
import { BadgeUnlockToast } from './components/BadgeUnlockToast'
import { GAME_VERSION } from './game/version'
import { loadSeenUpdateVersion, markUpdateSeen } from './game/updates'
import { useAccount } from './account/AccountProvider'
import { useSocial } from './account/SocialProvider'
import { DevAnnouncerPanel } from './components/DevAnnouncerPanel'
import { Tutorial } from './screens/Tutorial'
import { Online } from './screens/Online'
import { Leaderboard } from './screens/Leaderboard'
import { FestivalCircuit } from './screens/FestivalCircuit'
import { Career } from './screens/Career'
import {
  claimFestivalReward as claimFestivalTrackReward,
  festivalById,
  loadFestivalProgress,
  saveFestivalProgress,
  settleOnlineFestival,
  settleSoloFestival,
  setlistSynergy,
  type FestivalProgress,
  type FestivalRewardSummary,
  type FestivalRun,
} from './game/festivals'
import { ArtProvider } from './game/portrait-store'
import { audioEngine } from './game/audio'
import { announcerEngine } from './game/announcer'
import { GAMEPAD_OPEN_SETTINGS_EVENT } from './input/gamepad'
import {
  MIDNIGHT_GARDEN,
  pickVenue,
  type CircuitId,
  type CircuitRun,
  type ObjectiveSummary,
  type Venue,
} from './game/circuits'

type Screen =
  | 'menu'
  | 'battle'
  | 'circuit'
  | 'deck'
  | 'collection'
  | 'design'
  | 'team'
  | 'charts'
  | 'label'
  | 'tutorial'
  | 'online'
  | 'leaderboard'
  | 'festival'
  | 'career'

type OnlineFestivalIntersection = {
  eventId: string
  won: boolean
  draw: boolean
  completed: boolean
  opponentId: string | null
  opponentStreak: number
  features: number
  plays: Record<string, number>
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [charts, setCharts] = useState<ChartState>(() => loadCharts())
  const [label, setLabel] = useState<LabelState>(() => loadLabel())
  const [screen, setScreen] = useState<Screen>('menu')
  const [battleKey, setBattleKey] = useState(0)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [updatesOpen, setUpdatesOpen] = useState(false)
  const [updatesAreNew, setUpdatesAreNew] = useState(false)
  const [seenUpdate, setSeenUpdate] = useState(() => loadSeenUpdateVersion())
  const [circuitEntry, setCircuitEntry] = useState<CircuitId>('headliner')
  const [activeCircuit, setActiveCircuit] = useState<CircuitRun | null>(null)
  const [festivalProgress, setFestivalProgress] = useState<FestivalProgress>(() => loadFestivalProgress())
  const [activeFestivalRun, setActiveFestivalRun] = useState<FestivalRun | null>(null)
  const [festivalResult, setFestivalResult] = useState<FestivalRewardSummary | null>(null)
  const [onlineFestivalId, setOnlineFestivalId] = useState<string | null>(null)
  const [onlineFestivalIntent, setOnlineFestivalIntent] = useState<'host' | 'join' | null>(null)
  const [deckReturn, setDeckReturn] = useState<'menu' | 'festival' | 'online' | 'career'>('menu')
  const [career, setCareer] = useState<CareerState | null>(() => loadCareer())
  const [careerSlots, setCareerSlots] = useState<CareerSlotSummary[]>(() => careerSlotSummaries())
  const [careerSlotId, setCareerSlotId] = useState(() => careerActiveSlot())
  const [activeCareerMission, setActiveCareerMission] = useState<CareerMission | null>(null)
  const [activeCareerLocal, setActiveCareerLocal] = useState(false)
  const [careerReport, setCareerReport] = useState<CareerMissionReport | null>(null)
  const [matchVenue, setMatchVenue] = useState<Venue>(MIDNIGHT_GARDEN)
  const [accountOpen, setAccountOpen] = useState(false)
  const [badgeNotices, setBadgeNotices] = useState<BadgeUnlockNotice[]>([])
  const [onlineJoin, setOnlineJoin] = useState<{
    code: string
    mode: 'casual' | 'ranked'
    festivalId?: string | null
    nonce: number
  } | null>(null)
  const { account, recordMatch, syncLegacy } = useAccount()
  const social = useSocial()

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    if (!career) return
    const saved = saveCareer(career)
    registerCareerRuntime(saved)
    setCareerSlots(careerSlotSummaries())
  }, [career])

  useEffect(() => {
    saveCharts(charts)
  }, [charts])

  useEffect(() => {
    saveLabel(label)
  }, [label])

  useEffect(() => {
    saveFestivalProgress(festivalProgress)
  }, [festivalProgress])

  useEffect(() => {
    const summary = badgeProgramSummary(settings.artistProgress)
    const artistLevels = Object.values(settings.artistProgress).reduce(
      (sum, entry) => sum + Math.max(1, entry.level),
      0,
    )
    const chartHeat = charts.entries.length
      ? Math.round(
          charts.entries.reduce((sum, entry) => sum + entry.popularity, 0) /
            charts.entries.length,
        )
      : 0
    const labelScore =
      label.reputation +
      label.signed.length * 25 +
      label.albums.filter((album) => album.status === 'RELEASED').length * 40
    syncLegacy({
      badgeXp: summary.totalXp,
      badgeTiers: summary.tiers,
      artistLevels,
      labelScore,
      chartHeat,
    })
  }, [settings.artistProgress, charts, label, syncLegacy])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [screen])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.body.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    audioEngine.setVolumes(settings.musicVolume, settings.sfxVolume)
  }, [settings.musicVolume, settings.sfxVolume])

  useEffect(() => {
    announcerEngine.configure(settings.announcer)
  }, [settings.announcer])

  useEffect(() => {
    if (screen !== 'battle') audioEngine.setScene('menu')
  }, [screen])

  useEffect(() => {
    const unlock = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.audio-chip')) return
      audioEngine.unlock()
      announcerEngine.unlock()
    }
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => {
    const openControllerSettings = () => {
      if (
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], .battle-pause, .result, .show-intro, .cine, .logpanel.is-open',
        )
      ) {
        return
      }
      setSettingsOpen(true)
    }
    window.addEventListener(GAMEPAD_OPEN_SETTINGS_EVENT, openControllerSettings)
    return () =>
      window.removeEventListener(GAMEPAD_OPEN_SETTINGS_EVENT, openControllerSettings)
  }, [])

  const update = (patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }

  const openUpdates = () => {
    setUpdatesAreNew(seenUpdate !== GAME_VERSION)
    setUpdatesOpen(true)
  }

  const closeUpdates = () => {
    setUpdatesOpen(false)
    markUpdateSeen(GAME_VERSION)
    setSeenUpdate(GAME_VERSION)
  }

  const startBattle = (
    deck?: string[],
    circuit: CircuitRun | null = null,
    lineup?: string[],
    festivalRun: FestivalRun | null = null,
  ) => {
    if (containsPersonalArtist(deck ?? settings.deck) && (circuit || festivalRun)) return
    if (deck) {
      if (!validDeck(deck)) return
      const nextLineup = lineup ?? settings.lineup
      if (!validLineup(nextLineup, deck)) return
      update({ deck, lineup: nextLineup })
    }
    setActiveCircuit(festivalRun ? null : circuit)
    setActiveFestivalRun(festivalRun)
    setFestivalResult(null)
    if (!festivalRun) setOnlineFestivalId(null)
    setMatchVenue(festivalRun?.venue ?? circuit?.venue ?? pickVenue('headliner'))
    setScreen('battle')
    setBattleKey((key) => key + 1)
  }

  const switchCareerSlot = (slotId: string) => {
    if (slotId === careerSlotId) return
    if (career) {
      saveCareer(career)
      unregisterCareerRuntime(career.artistId)
    }
    const next = selectCareerSlot(slotId)
    setCareer(next)
    setCareerSlotId(slotId)
    setCareerReport(null)
    setActiveCareerMission(null)
    setActiveCareerLocal(false)
    setCareerSlots(careerSlotSummaries())
    setScreen('career')
  }

  const removeCareerSlot = (slotId: string) => {
    const active = slotId === careerSlotId
    if (active && career) unregisterCareerRuntime(career.artistId)
    const result = deleteCareerSlot(slotId)
    setCareerSlotId(result.activeSlotId)
    if (active) {
      setCareer(null)
      setCareerReport(null)
      setActiveCareerMission(null)
      setActiveCareerLocal(false)
    }
    setCareerSlots(careerSlotSummaries())
    setScreen('career')
  }

  const startCareerMission = (mission: CareerMission) => {
    setActiveCareerMission(mission)
    setActiveCareerLocal(false)
    setCareerReport(null)
    setActiveCircuit(null)
    setActiveFestivalRun(null)
    setOnlineFestivalId(null)
    setMatchVenue(mission.venue)
    setScreen('battle')
    setBattleKey((key) => key + 1)
  }

  const startCareerLocal = () => {
    if (!career) return
    setActiveCareerMission(null)
    setActiveCareerLocal(true)
    setActiveCircuit(null)
    setActiveFestivalRun(null)
    setOnlineFestivalId(null)
    setMatchVenue(MIDNIGHT_GARDEN)
    setScreen('battle')
    setBattleKey((key) => key + 1)
  }

  const openCircuit = (circuit: CircuitId = 'headliner') => {
    setCircuitEntry(circuit)
    setScreen('circuit')
  }

  const startCircuitRun = (run: CircuitRun) => {
    setCircuitEntry(run.circuit)
    startBattle(undefined, run)
  }

  const startFestivalRun = (run: FestivalRun) => {
    setOnlineFestivalId(null)
    startBattle(undefined, null, undefined, run)
  }

  const openFestivalRoom = (eventId: string, intent: 'host' | 'join') => {
    setOnlineFestivalId(eventId)
    setOnlineFestivalIntent(intent)
    setActiveFestivalRun(null)
    setActiveCircuit(null)
    setFestivalResult(null)
    setScreen('online')
  }

  const claimFestivalReward = (tier: 'gold' | 'platinum' | 'diamond') => {
    const result = claimFestivalTrackReward(festivalProgress, tier)
    if (!result) return
    setFestivalProgress(result.progress)
    setSettings((current) => ({
      ...current,
      team: {
        ...current.team,
        credits: current.team.credits + result.reward.credits,
        buzz: current.team.buzz + result.reward.buzz,
      },
    }))
  }

  const recordFestivalOnlineResult = (result: OnlineFestivalIntersection) => {
    const festivalEvent = festivalById(result.eventId)
    if (!festivalEvent) return
    const synergy = setlistSynergy(settings.deck, festivalEvent)
    const settled = settleOnlineFestival({
      event: festivalEvent,
      progress: festivalProgress,
      won: result.won,
      draw: result.draw,
      completed: result.completed,
      opponentId: result.opponentId,
      opponentStreak: result.opponentStreak,
      features: result.features,
      plays: result.plays,
      synergyActive: synergy.activated,
    })
    setFestivalProgress(settled.progress)
    setFestivalResult(settled.summary)
    if (settled.summary.outcome === 'online-win' || settled.summary.outcome === 'online-loss') {
      setSettings((current) => ({
        ...current,
        artistProgress: awardArtistXp(
          current.artistProgress,
          result.plays,
          result.won,
          synergy.activated ? festivalEvent.progression_multiplier : 1,
        ),
      }))
    }
  }

  const saveDeck = (deck: string[], lineup: string[]) => {
    if (!validDeck(deck) || !validLineup(lineup, deck)) return
    if (deckReturn === 'career' && career) {
      setCareer(saveCareer({ ...career, deck, lineup }))
      return
    }
    update({ deck, lineup })
  }

  const selectDirection = (theme: ThemeId) => {
    update({ theme, selectedDirection: theme })
  }

  const updateTeam = (patch: Partial<TeamProgress>) => {
    setSettings((current) => ({ ...current, team: { ...current.team, ...patch } }))
  }

  const updateLoadout = (artistId: string, loadout: string[]) => {
    setSettings((current) => {
      const previous = current.artistProgress[artistId] ?? { xp: 0, level: 1 }
      return {
        ...current,
        artistProgress: {
          ...current.artistProgress,
          [artistId]: { ...previous, loadout: loadout.slice(0, 3) },
        },
      }
    })
  }

  const updateBadgeLoadout = (artistId: string, badgeLoadout: string[]) => {
    setSettings((current) => {
      const previous = current.artistProgress[artistId] ?? { xp: 0, level: 1 }
      return {
        ...current,
        artistProgress: {
          ...current.artistProgress,
          [artistId]: {
            ...previous,
            badgeLoadout: sanitizeBadgeLoadout(badgeLoadout, previous.badges),
          },
        },
      }
    })
  }

  const queueBadgeNotices = (notices: BadgeUnlockNotice[]) => {
    if (!notices.length) return
    setBadgeNotices((current) => [...notices, ...current].slice(0, 5))
  }

  const awardOnlineBadges = (
    winner: 'player' | 'rival' | 'draw',
    plays: Record<string, number>,
    performance: BattlePerformance,
  ) => {
    const result = awardBadgeXp(
      settings.artistProgress,
      plays,
      winner === 'player',
      performance.cards,
    )
    queueBadgeNotices(result.notices)
    setSettings((current) => ({
      ...current,
      artistProgress: applyBadgeUpdates(current.artistProgress, result.updates),
    }))
  }

  const recordResult = (
    winner: 'player' | 'rival' | 'draw',
    plays: Record<string, number> = {},
    objectives: ObjectiveSummary = { completed: 0, total: 0, credits: 0, buzz: 0 },
    performance: BattlePerformance,
  ) => {
    if (career) {
      if (activeCareerMission) {
        const resolved = resolveCareerMission(career, activeCareerMission, winner, performance)
        setCareer(resolved.career)
        setCareerReport(resolved.report)
      } else if (activeCareerLocal || containsPersonalArtist(settings.deck)) {
        const local = awardLocalCareerXp(career, winner === 'player', performance)
        setCareer(local.career)
        setCareerReport(local.report)
      }
    }
    recordMatch({
      result: winner === 'player' ? 'win' : winner === 'rival' ? 'loss' : 'draw',
      mode: 'solo',
      plays,
      attacks: performance.attacks,
      actions: performance.actions,
      damage: performance.damage,
      kos: performance.kos,
      features: performance.features,
      encores: performance.encores,
      crateDraws: performance.crateDraws,
      responseMs: performance.responseMs,
      responseSamples: performance.responseSamples,
    })
    if (Object.keys(plays).length) {
      setCharts((current) => applyChartImpact(current, plays))
    }
    const badgeResult = awardBadgeXp(
      settings.artistProgress,
      plays,
      winner === 'player',
      performance.cards,
    )
    queueBadgeNotices(badgeResult.notices)
    const festivalRun = activeFestivalRun
    let festivalSummary: FestivalRewardSummary | null = null
    if (festivalRun) {
      const objectiveDetails = festivalRun.objectives.map((objective, index) => ({
        ...objective,
        done: index < objectives.completed,
      }))
      const settled = settleSoloFestival({
        event: festivalRun.event,
        stop: festivalRun.stop,
        progress: festivalProgress,
        won: winner === 'player',
        plays,
        objectives: objectiveDetails,
        synergyActive: festivalRun.synergy.activated,
        official: festivalRun.official,
      })
      festivalSummary = settled.summary
      setFestivalProgress(settled.progress)
      setFestivalResult(settled.summary)
    }
    const xpMultiplier =
      festivalRun?.official && festivalRun.synergy.activated
        ? festivalRun.event.progression_multiplier
        : 1
    setSettings((current) => {
      const leveled = awardArtistXp(
        current.artistProgress,
        plays,
        winner === 'player',
        xpMultiplier,
      )
      const artistProgress = applyBadgeUpdates(leveled, badgeResult.updates)
      const run = activeCircuit
      const festivalCredits = festivalSummary?.credits ?? 0
      const festivalBuzz = festivalSummary?.buzz ?? 0
      if (winner === 'player') {
        return {
          ...current,
          artistProgress,
          wins: current.wins + 1,
          team: {
            ...current.team,
            credits:
              current.team.credits +
              (run?.purseCredits ?? 150) +
              objectives.credits +
              festivalCredits,
            buzz:
              current.team.buzz +
              (run?.purseBuzz ?? 45) +
              objectives.buzz +
              festivalBuzz,
            circuitWins: current.team.circuitWins + (run || festivalRun ? 1 : 0),
          },
        }
      }
      if (winner === 'rival') {
        return {
          ...current,
          artistProgress,
          losses: current.losses + 1,
          team: {
            ...current.team,
            credits: current.team.credits + Math.round(objectives.credits * 0.25),
            buzz: current.team.buzz + Math.round(objectives.buzz * 0.25),
          },
        }
      }
      return { ...current, artistProgress }
    })
  }

  const claimMission = (missionId: string) => {
    setSettings((current) => {
      const mission = MISSIONS.find((item) => item.id === missionId)
      if (!mission || !canClaimMission(mission, current)) return current
      return {
        ...current,
        team: {
          ...current.team,
          credits: current.team.credits + mission.rewardCredits,
          buzz: current.team.buzz + mission.rewardBuzz,
          claimedMissions: [...current.team.claimedMissions, mission.id],
        },
      }
    })
  }

  const advanceWeek = () => {
    if (label.crises.some((crisis) => crisis.status === 'OPEN')) return
    const advancedChart = advanceCharts(charts)
    const summary = advanceLabelWeek(label, advancedChart, settings.team.credits)
    let nextChart = advancedChart
    for (const boost of summary.boosts) {
      nextChart = applyChartBoost(nextChart, boost.artistId, {
        popularity: boost.popularity,
        spins: boost.spins,
        momentum: boost.momentum,
        note: boost.note,
      })
    }
    setCharts(nextChart)
    setLabel(summary.label)
    updateTeam({ credits: summary.credits })
  }

  const handleSign = (artistId: string) => {
    const fee = signingFee(artistId, charts)
    const result = signArtist(label, artistId, fee, settings.team.credits, label.week)
    if (!result) return
    setLabel(result.label)
    updateTeam({ credits: result.credits })
  }

  const handleDropArtist = (artistId: string) => {
    const result = dropArtist(label, artistId, settings.team.credits)
    if (!result) return
    setLabel(result.label)
  }

  const handleStartAlbum = (input: {
    artistId: string
    title: string
    production: number
    marketing: number
    releaseWeek: number
  }) => {
    const result = startAlbum(label, input, settings.team.credits)
    if (!result) return
    setLabel(result.label)
    updateTeam({ credits: result.credits })
  }

  const handleReviewExpense = (expenseId: string, approve: boolean) => {
    const result = reviewExpense(label, expenseId, approve, settings.team.credits)
    if (!result) return
    setLabel(result.label)
    updateTeam({ credits: result.credits })
  }

  const handleResolveCrisis = (crisisId: string, optionId: string) => {
    const result = resolveCrisis(label, crisisId, optionId, settings.team.credits)
    if (!result) return
    setLabel(result.label)
    updateTeam({ credits: result.credits })
  }

  return (
    <ArtProvider>
      <div className={`app theme-${settings.theme} ${settings.reducedMotion ? 'reduce-motion' : ''}`}>
        <div className="app__grain" aria-hidden="true" />
        {screen === 'menu' && (
          <MainMenu
            settings={settings}
            charts={charts}
            onStart={() => startBattle()}
            onDeck={() => setScreen('deck')}
            onCollection={() => setScreen('collection')}
            onDesign={() => setScreen('design')}
            onRules={() => setRulesOpen(true)}
            onTeam={() => setScreen('team')}
            onCharts={() => setScreen('charts')}
            onCircuit={openCircuit}
            onFestival={() => setScreen('festival')}
            onDifficulty={(difficulty: Difficulty) => update({ difficulty })}
            onToggleMotion={() => update({ reducedMotion: !settings.reducedMotion })}
            onTutorial={() => setScreen('tutorial')}
            onSettings={() => setSettingsOpen(true)}
            onUpdates={openUpdates}
            updatesUnread={seenUpdate !== GAME_VERSION}
            onOnline={() => {
              setOnlineFestivalId(null)
              setOnlineFestivalIntent(null)
              setFestivalResult(null)
              setScreen('online')
            }}
            onLeaderboard={() => setScreen('leaderboard')}
            onCareer={() => setScreen('career')}
            careerName={career?.stageName ?? null}
            account={account}
            onAccount={() => setAccountOpen(true)}
          />
        )}

        {screen === 'career' && (
          <Career
            settings={settings}
            career={career}
            slots={careerSlots}
            activeSlotId={careerSlotId}
            onSelectSlot={switchCareerSlot}
            onDeleteSlot={removeCareerSlot}
            report={careerReport}
            onDismissReport={() => setCareerReport(null)}
            onCareerChange={(next) => setCareer(next)}
            onStartMission={startCareerMission}
            onStartLocal={startCareerLocal}
            onDeck={() => {
              setDeckReturn('career')
              setScreen('deck')
            }}
            onBack={() => setScreen('menu')}
            onSettings={() => setSettingsOpen(true)}
            onReset={() => removeCareerSlot(careerSlotId)}
          />
        )}

        {screen === 'battle' && (
          <Battle
            key={battleKey}
            settings={career && (activeCareerMission || activeCareerLocal) ? careerBattleSettings(settings, career) : settings}
            careerMission={activeCareerMission}
            careerDifficulty={career && (activeCareerMission || activeCareerLocal) ? career.careerDifficulty : undefined}
            onExit={() => {
              if (activeCareerMission || activeCareerLocal) {
                setActiveCareerMission(null)
                setActiveCareerLocal(false)
                setScreen('career')
              } else if (activeFestivalRun) setScreen('festival')
              else if (activeCircuit) openCircuit(activeCircuit.circuit)
              else setScreen('menu')
            }}
            onRematch={() => {
              if (activeCareerMission) startCareerMission(activeCareerMission)
              else if (activeCareerLocal) startCareerLocal()
              else if (activeFestivalRun) startBattle(undefined, null, undefined, activeFestivalRun)
              else if (activeCircuit) openCircuit(activeCircuit.circuit)
              else startBattle()
            }}
            onDeck={() => {
              setDeckReturn(activeCareerMission || activeCareerLocal ? 'career' : activeFestivalRun ? 'festival' : 'menu')
              setScreen('deck')
            }}
            onResult={recordResult}
            onTutorial={() => setScreen('tutorial')}
            onUpdate={update}
            circuit={activeFestivalRun?.circuit ?? activeCircuit}
            festivalRun={activeFestivalRun}
            festivalReward={festivalResult}
            venue={matchVenue}
          />
        )}

        {screen === 'festival' && (
          <FestivalCircuit
            settings={settings}
            progress={festivalProgress}
            lastResult={festivalResult}
            onBack={() => setScreen('menu')}
            onDeck={() => {
              setDeckReturn('festival')
              setScreen('deck')
            }}
            onStartSolo={startFestivalRun}
            onOpenOnline={openFestivalRoom}
            onClaimReward={claimFestivalReward}
          />
        )}

        {screen === 'circuit' && (
          <Circuit
            settings={settings}
            initialCircuit={circuitEntry}
            onBack={() => setScreen('menu')}
            onStart={startCircuitRun}
          />
        )}

        {screen === 'tutorial' && (
          <Tutorial
            onExit={() => setScreen('menu')}
            onPlay={() => startBattle()}
          />
        )}

        {screen === 'online' && (
          <Online
            settings={settings}
            festivalId={onlineFestivalId}
            festivalIntent={onlineFestivalIntent}
            festivalProgress={festivalProgress}
            festivalReward={festivalResult}
            onFestivalResult={recordFestivalOnlineResult}
            onBack={() => {
              if (onlineFestivalId) setScreen('festival')
              else setScreen('menu')
            }}
            onDeck={() => {
              setDeckReturn(onlineFestivalId ? 'festival' : 'menu')
              setScreen('deck')
            }}
            onUpdate={update}
            onAccount={() => setAccountOpen(true)}
            onBadgeResult={awardOnlineBadges}
            joinRequest={onlineJoin}
            onJoinConsumed={() => setOnlineJoin(null)}
          />
        )}

        {screen === 'leaderboard' && (
          <Leaderboard
            settings={settings}
            label={label}
            charts={charts}
            onBack={() => setScreen('menu')}
          />
        )}

        {screen === 'team' && (
          <UltimateTeam
            settings={settings}
            label={label}
            avatarArtistId={account?.avatarArtistId ?? null}
            charts={charts}
            onBack={() => setScreen('menu')}
            onDeck={() => setScreen('deck')}
            onCollection={() => setScreen('collection')}
            onCircuit={openCircuit}
            onClaim={claimMission}
            onTeamChange={updateTeam}
            onLabel={() => setScreen('label')}
            onCharts={() => setScreen('charts')}
          />
        )}

        {screen === 'charts' && (
          <Charts
            charts={charts}
            label={label}
            team={settings.team}
            onAdvance={advanceWeek}
            onBack={() => setScreen('menu')}
            onLabel={() => setScreen('label')}
          />
        )}

        {screen === 'label' && (
          <LabelOffice
            team={settings.team}
            label={label}
            avatarArtistId={account?.avatarArtistId ?? null}
            charts={charts}
            onBack={() => setScreen('menu')}
            onTeam={() => setScreen('team')}
            onCharts={() => setScreen('charts')}
            onAdvance={advanceWeek}
            onSign={handleSign}
            onDropArtist={handleDropArtist}
            onStartAlbum={handleStartAlbum}
            onReviewExpense={handleReviewExpense}
            onResolveCrisis={handleResolveCrisis}
          />
        )}

        {screen === 'deck' && (
          <DeckBuilder
            theme={settings.theme}
            deck={deckReturn === 'career' && career ? career.deck : settings.deck}
            lineup={deckReturn === 'career' && career ? career.lineup : settings.lineup}
            credits={settings.team.credits}
            buzz={settings.team.buzz}
            progress={settings.artistProgress}
            personalArtist={career ? registerCareerRuntime(career) : null}
            allowPersonal={Boolean(career) && deckReturn !== 'festival' && deckReturn !== 'online'}
            onSave={saveDeck}
            onLoadoutChange={updateLoadout}
            onPlay={(deck, lineup) => {
              setOnlineFestivalId(null)
              setActiveFestivalRun(null)
              if (deckReturn === 'career' && career) {
                setCareer(saveCareer({ ...career, deck, lineup }))
                setActiveCareerMission(null)
                setActiveCareerLocal(true)
                setMatchVenue(MIDNIGHT_GARDEN)
                setScreen('battle')
                setBattleKey((key) => key + 1)
              } else {
                startBattle(deck, null, lineup)
              }
            }}
            onBack={() => {
              if (deckReturn === 'career') setScreen('career')
              else if (deckReturn === 'festival' && onlineFestivalId) setScreen('online')
              else if (deckReturn === 'festival') setScreen('festival')
              else setScreen('menu')
            }}
          />
        )}

        {screen === 'collection' && (
          <Collection
            theme={settings.theme}
            progress={settings.artistProgress}
            onLoadoutChange={updateLoadout}
            onBadgeLoadoutChange={updateBadgeLoadout}
            festivalProgress={festivalProgress}
            onBack={() => setScreen('menu')}
            onDeck={() => setScreen('deck')}
          />
        )}

        {screen === 'design' && (
          <DesignLab
            currentTheme={settings.theme}
            selectedDirection={settings.selectedDirection}
            onSelect={selectDirection}
            onBack={() => setScreen('menu')}
          />
        )}

        {updatesOpen && (
          <UpdatesModal isNewUpdate={updatesAreNew} onClose={closeUpdates} />
        )}

        {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

        {settingsOpen && (
          <SettingsModal
            settings={settings}
            onUpdate={update}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} career={career} />}

        {social.invites[0] && (
          <div className="invite-toast" role="alertdialog" aria-label="Game invite">
            <div className="invite-toast__glow" aria-hidden="true" />
            <div className="invite-toast__body">
              <span>FRIEND INVITE · {social.invites[0].mode.toUpperCase()}</span>
              <b>{social.invites[0].fromName} WANTS TO RUN A MATCH</b>
              <p>Room {social.invites[0].roomCode} is open. Accept to join the lobby.</p>
              <div className="invite-toast__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => social.declineInvite(social.invites[0].id)}
                >
                  DECLINE
                </button>
                <button
                  className="btn btn--primary btn--sm"
                  disabled={social.status === 'playing'}
                  onClick={() => {
                    const invite = social.invites[0]
                    const accepted = social.acceptInvite(invite.id)
                    if (!accepted) return
                    setOnlineJoin({
                      code: accepted.roomCode,
                      mode: accepted.mode,
                      festivalId: accepted.festivalId ?? null,
                      nonce: Date.now(),
                    })
                    setOnlineFestivalId(accepted.festivalId ?? null)
                    setOnlineFestivalIntent(accepted.festivalId ? 'join' : null)
                    setScreen('online')
                  }}
                >
                  {social.status === 'playing' ? 'IN A MATCH' : 'ACCEPT & JOIN'}
                </button>
              </div>
            </div>
          </div>
        )}

        <BadgeUnlockToast
          notices={badgeNotices}
          onDismiss={(id) =>
            setBadgeNotices((current) => current.filter((notice) => notice.id !== id))
          }
        />

        {import.meta.env.DEV && <DevAnnouncerPanel />}
      </div>
    </ArtProvider>
  )
}
