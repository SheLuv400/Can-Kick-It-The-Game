import { useEffect, useState } from 'react'
import type { Difficulty, Settings, TeamProgress, ThemeId } from './game/types'
import { loadSettings, saveSettings, validDeck } from './game/settings'
import { canClaimMission, MISSIONS } from './game/ultimate'
import { awardArtistXp } from './game/moves'
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
import { Battle } from './screens/Battle'
import { DeckBuilder } from './screens/DeckBuilder'
import { Collection } from './screens/Collection'
import { DesignLab } from './screens/DesignLab'
import { UltimateTeam } from './screens/UltimateTeam'
import { Charts } from './screens/Charts'
import { LabelOffice } from './screens/LabelOffice'
import { RulesModal } from './components/RulesModal'
import { SettingsModal } from './components/SettingsModal'
import { Tutorial } from './screens/Tutorial'
import { ArtProvider } from './game/portrait-store'

type Screen = 'menu' | 'battle' | 'deck' | 'collection' | 'design' | 'team' | 'charts' | 'label' | 'tutorial'

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [charts, setCharts] = useState<ChartState>(() => loadCharts())
  const [label, setLabel] = useState<LabelState>(() => loadLabel())
  const [screen, setScreen] = useState<Screen>('menu')
  const [battleKey, setBattleKey] = useState(0)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [circuitBattle, setCircuitBattle] = useState(false)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveCharts(charts)
  }, [charts])

  useEffect(() => {
    saveLabel(label)
  }, [label])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [screen])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.body.dataset.theme = settings.theme
  }, [settings.theme])

  const update = (patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }

  const startBattle = (deck?: string[], circuit = false) => {
    if (deck) {
      if (!validDeck(deck)) return
      update({ deck })
    }
    setCircuitBattle(circuit)
    setScreen('battle')
    setBattleKey((key) => key + 1)
  }

  const startCircuit = () => {
    const nextDifficulty: Difficulty =
      settings.team.circuitWins < 1 ? 'OPENING' : settings.team.circuitWins < 3 ? 'HEADLINER' : 'LEGEND'
    setSettings((current) => ({ ...current, difficulty: nextDifficulty }))
    startBattle(undefined, true)
  }

  const saveDeck = (deck: string[]) => {
    if (!validDeck(deck)) return
    update({ deck })
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

  const recordResult = (winner: 'player' | 'rival' | 'draw', plays: Record<string, number> = {}) => {
    if (Object.keys(plays).length) {
      setCharts((current) => applyChartImpact(current, plays))
    }
    setSettings((current) => {
      const artistProgress = awardArtistXp(
        current.artistProgress,
        plays,
        winner === 'player',
      )
      if (winner === 'player') {
        const circuit = circuitBattle
        return {
          ...current,
          artistProgress,
          wins: current.wins + 1,
          team: {
            ...current.team,
            credits: current.team.credits + (circuit ? 250 : 150),
            buzz: current.team.buzz + (circuit ? 90 : 45),
            circuitWins: current.team.circuitWins + (circuit ? 1 : 0),
          },
        }
      }
      if (winner === 'rival') return { ...current, artistProgress, losses: current.losses + 1 }
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
            onCircuit={startCircuit}
            onDifficulty={(difficulty: Difficulty) => update({ difficulty })}
            onToggleMotion={() => update({ reducedMotion: !settings.reducedMotion })}
            onTutorial={() => setScreen('tutorial')}
            onSettings={() => setSettingsOpen(true)}
          />
        )}

        {screen === 'battle' && (
          <Battle
            key={battleKey}
            settings={settings}
            onExit={() => setScreen('menu')}
            onRematch={() => startBattle(undefined, circuitBattle)}
            onDeck={() => setScreen('deck')}
            onResult={recordResult}
            onTutorial={() => setScreen('tutorial')}
          />
        )}

        {screen === 'tutorial' && (
          <Tutorial
            onExit={() => setScreen('menu')}
            onPlay={() => startBattle()}
          />
        )}

        {screen === 'team' && (
          <UltimateTeam
            settings={settings}
            label={label}
            charts={charts}
            onBack={() => setScreen('menu')}
            onDeck={() => setScreen('deck')}
            onCollection={() => setScreen('collection')}
            onCircuit={startCircuit}
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
            charts={charts}
            onBack={() => setScreen('menu')}
            onTeam={() => setScreen('team')}
            onCharts={() => setScreen('charts')}
            onAdvance={advanceWeek}
            onSign={handleSign}
            onStartAlbum={handleStartAlbum}
            onReviewExpense={handleReviewExpense}
            onResolveCrisis={handleResolveCrisis}
          />
        )}

        {screen === 'deck' && (
          <DeckBuilder
            theme={settings.theme}
            deck={settings.deck}
            credits={settings.team.credits}
            buzz={settings.team.buzz}
            progress={settings.artistProgress}
            onSave={saveDeck}
            onLoadoutChange={updateLoadout}
            onPlay={(deck) => startBattle(deck)}
            onBack={() => setScreen('menu')}
          />
        )}

        {screen === 'collection' && (
          <Collection
            theme={settings.theme}
            progress={settings.artistProgress}
            onLoadoutChange={updateLoadout}
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

        {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

        {settingsOpen && (
          <SettingsModal
            settings={settings}
            onUpdate={update}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </ArtProvider>
  )
}
