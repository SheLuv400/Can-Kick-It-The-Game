import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Move } from '../game/types'
import type { BackstageCard, StageCard } from '../game/battle'
import { featureDamage } from '../game/battle'
import { CATEGORY_LABEL, RARITY_META, crateCard, createCrateDeck } from '../game/crate'
import { ELEMENT_META, battleStatsFor, defaultLoadout, isAttackMove, moveById, movesForArtist } from '../game/moves'
import { getArtist } from '../game/roster'
import { Card } from '../components/Card'
import { BrandLogo } from '../components/BrandLogo'
import { GameIcon } from '../components/GameIcon'
import { Portrait } from '../components/Portrait'
import { StageUnit } from '../components/Combat'
import { portraitUrl } from '../game/portraits'

interface TutorialProps {
  onExit: () => void
  onPlay: () => void
}

type ChapterIcon = 'crowd' | 'collection' | 'bolt' | 'play' | 'shield' | 'backstage' | 'crate' | 'spark' | 'team' | 'charts'

interface Chapter {
  number: number
  title: string
  subtitle: string
  icon: ChapterIcon
}

interface TutorialStep {
  id: string
  chapter: number
  title: string
  body: string
  detail?: string
  target?: string
  action?: string
  next?: boolean
}

const TUTORIAL_KEY = 'ciki.tutorial.v1'
const TUTORIAL_ARTIST_IDS = {
  macko: 'macko-deville',
  juno: 'juno-maison',
  krown: 'krown-vandal',
  pixel: 'pixel-cherry',
  sable: 'sable-monroe',
} as const
const MACKO = getArtist(TUTORIAL_ARTIST_IDS.macko)
const JUNO = getArtist(TUTORIAL_ARTIST_IDS.juno)
const KROWN = getArtist(TUTORIAL_ARTIST_IDS.krown)
const PIXEL = getArtist(TUTORIAL_ARTIST_IDS.pixel)
const SABLE = getArtist(TUTORIAL_ARTIST_IDS.sable)
const HOST = getArtist('casso-royale')
const TUTORIAL_HAND = ['cipher-jones', 'renee-blue', 'rook-havoc', 'luka-dragan', JUNO.id]
const TUTORIAL_CRATE_STACK = createCrateDeck().length

const CHAPTERS: Chapter[] = [
  { number: 1, title: 'Welcome to the Show', subtitle: 'The room, the goal, the two meters', icon: 'crowd' },
  { number: 2, title: 'Deploy Your Artists', subtitle: 'Hype, hand and stage slots', icon: 'collection' },
  { number: 3, title: 'Hype & Turn Management', subtitle: 'Spend it, end the turn, get it back', icon: 'bolt' },
  { number: 4, title: 'Offensive Performance', subtitle: 'Artist, move, target, damage', icon: 'play' },
  { number: 5, title: 'Defense & Survival', subtitle: 'HP, shields and the Clapback window', icon: 'shield' },
  { number: 6, title: 'Backstage', subtitle: 'Defeat, revival and one more song', icon: 'backstage' },
  { number: 7, title: 'The Mystery Crate', subtitle: 'Draw, cool down, cash in', icon: 'crate' },
  { number: 8, title: 'Elemental Powers', subtitle: 'Status effects and cleanses', icon: 'spark' },
  { number: 9, title: 'Combos & Encores', subtitle: 'Crew chemistry and transformations', icon: 'team' },
  { number: 10, title: 'Win the Show', subtitle: 'Finish the room and take the night', icon: 'charts' },
]

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    chapter: 1,
    title: 'Welcome to the Midnight Garden',
    body: 'You and THE HEADLINER each protect a Crowd Meter. Your goal is to empty their room before they empty yours. The house closes after round 12, so Curfew can decide a close match.',
    detail: 'Watch both Crowd Meters at the top. Every artist you deploy, every move you land and every Crate card you draw is in service of that number.',
    next: true,
  },
  {
    id: 'deploy-card',
    chapter: 2,
    title: 'Pick an artist from your hand',
    body: 'Your hand is the bottom row. Artists cost Hype to perform. Select Juno Maison, the R&B artist in hand.',
    detail: 'You start with 4 Hype. Every turn you gain 2 more, up to 12.',
    target: 'hand',
    action: 'CLICK JUNO MAISON IN YOUR HAND',
  },
  {
    id: 'deploy-slot',
    chapter: 2,
    title: 'Choose an open stage slot',
    body: 'You have five live slots. Juno can join Macko Deville on stage. Click any open LIVE SLOT.',
    detail: 'A full stage has five artists. Empty slots are still part of the battlefield — they show where the next artist can land.',
    target: 'player-slot',
    action: 'CLICK AN OPEN LIVE SLOT',
  },
  {
    id: 'deployed',
    chapter: 2,
    title: 'Two artists, one crew',
    body: 'Macko and Juno are both MIDNIGHT CARTEL. Two crewmates unlock a Feature Verse later in the lesson.',
    detail: 'On stage, each artist keeps their own HP, DEF, Shield and status effects.',
    next: true,
  },
  {
    id: 'hype',
    chapter: 3,
    title: 'Hype is the tempo',
    body: 'Placing Juno spent Hype. A move also costs Hype, so the counter tells you what you can afford this turn. Training starts with a full Hype bar; a real show starts at 4. Click the Hype counter to continue.',
    detail: 'You gain +2 Hype at the start of each turn. Ending a turn with unused Hype is sometimes the right play — but not usually.',
    target: 'hype',
    action: 'CLICK THE HYPE COUNTER',
  },
  {
    id: 'select-artist',
    chapter: 4,
    title: 'Select your performer',
    body: 'Macko Deville is your heavy hitter. Click his card on stage to open his three equipped moves.',
    detail: 'The gold outline means Macko is selected. His vitals stay readable below the artwork.',
    target: 'macko',
    action: 'CLICK MACKO DEVILLE ON STAGE',
  },
  {
    id: 'choose-move',
    chapter: 4,
    title: 'Read the three moves',
    body: 'Macko has a basic attack, an elemental Fire attack and a defensive shield. Choose HEAVY TALK to hit one enemy artist.',
    detail: 'Each move shows its type, Hype cost and exact effect before you commit.',
    target: 'moves',
    action: 'CLICK HEAVY TALK',
  },
  {
    id: 'choose-target',
    chapter: 4,
    title: 'Lock the target',
    body: 'Pixel Cherry is the Headliner’s lowest-HP artist. Click Pixel to land the hit.',
    detail: 'Target the artist who is closest to Backstage. Removing a performer also puts pressure on the opposing Crowd Meter.',
    target: 'enemy',
    action: 'CLICK PIXEL CHERRY',
  },
  {
    id: 'offense-result',
    chapter: 4,
    title: 'Damage lands on the artist',
    body: 'Heavy Talk hit Pixel Cherry. Her HP dropped and Macko’s action is spent for this turn.',
    detail: 'If no artists are left on stage, attacks hit the Crowd Meter directly. Reduce the crowd to zero to win.',
    next: true,
  },
  {
    id: 'defense',
    chapter: 5,
    title: 'The Clapback window',
    body: 'The Headliner answers with an 8-damage hit on Macko. A defensive window opens when the hit is big enough. Click CLAPBACK to cut it in half and gain +1 Hype.',
    detail: 'You carry two Clapbacks. Armor, Shield HP and healing keep artists alive; Clapback turns a big hit into a manageable one.',
    target: 'defense',
    action: 'CLICK CLAPBACK',
  },
  {
    id: 'defense-result',
    chapter: 5,
    title: 'Defense is tempo too',
    body: 'The hit was reduced to 4 damage and you gained Hype. Macko survives, and the room stays in your hands.',
    detail: 'Shield HP absorbs damage before HP. DEF reduces incoming hit damage. Some elemental moves also add Guard or heal the performer.',
    next: true,
  },
  {
    id: 'backstage',
    chapter: 6,
    title: 'Backstage is not gone',
    body: 'Krown Vandal was defeated earlier and is waiting Backstage. Click BACKSTAGE to open the defeated list.',
    detail: 'Defeated artists leave the stage, but their card, level and equipped moves are kept.',
    target: 'backstage',
    action: 'OPEN BACKSTAGE',
  },
  {
    id: 'revive',
    chapter: 6,
    title: 'Call one back on stage',
    body: 'Krown is eligible for a Call Back. Click CALL BACK ON STAGE to return him at full HP.',
    detail: 'A revived artist cannot attack immediately. Call Back is once per match and costs 4 Hype.',
    target: 'revive',
    action: 'CLICK CALL BACK ON STAGE',
  },
  {
    id: 'revive-result',
    chapter: 6,
    title: 'One more song',
    body: 'Krown is back on stage at full HP, with his action spent. This is how a set survives a bad round.',
    detail: 'Keep one eye on Backstage. A revival can protect a key crew bonus or refill an empty slot.',
    next: true,
  },
  {
    id: 'crate',
    chapter: 7,
    title: 'Draw from the Crate',
    body: 'The Crate holds special cards. Click DRAW FROM THE CRATE to pull a card for 2 Hype. Drawing no longer ends your turn, so the card can be used right away.',
    detail: 'You can hold up to six special cards. They are separate from your artist hand.',
    target: 'crate',
    action: 'CLICK DRAW FROM THE CRATE',
  },
  {
    id: 'crate-result',
    chapter: 7,
    title: 'Cool down, then cash in',
    body: 'HOUSE MIC adds +2 damage to your next attack. It is in your special hand, ready for the next turn.',
    detail: 'The Crate can give attacks, shields, revivals, immunity, reversals and elemental powers.',
    next: true,
  },
  {
    id: 'special',
    chapter: 7,
    title: 'Use the special card',
    body: 'Click HOUSE MIC in the special hand. Then choose Macko as the artist who will carry the bonus.',
    target: 'special',
    action: 'CLICK HOUSE MIC',
  },
  {
    id: 'special-target',
    chapter: 7,
    title: 'Choose the artist',
    body: 'Point the HOUSE MIC bonus at Macko. His next attack will deal +2 damage.',
    target: 'macko',
    action: 'CLICK MACKO DEVILLE',
  },
  {
    id: 'special-result',
    chapter: 7,
    title: 'The bonus is armed',
    body: 'Macko now has +2 NEXT. The card left your special hand and the buff will be spent on his next attack.',
    detail: 'Special cards are powerful because they do not use an artist action. They still end or shape the turn.',
    next: true,
  },
  {
    id: 'element-attack',
    chapter: 8,
    title: 'Apply an elemental status',
    body: 'Macko’s SHARP BARS applies Burn to Pixel Cherry, and the stage backdraft catches Macko too. Click SHARP BARS in Macko’s move panel.',
    detail: 'Pixel Cherry takes the hit and a BURN status. Macko also picks up BURN from the backdraft; Juno will cleanse it next.',
    target: 'moves',
    action: 'CLICK SHARP BARS',
  },
  {
    id: 'element-cleanse',
    chapter: 8,
    title: 'Counter the status',
    body: 'Macko is now burning. Select Juno’s ROOM SERVICE to heal Macko and cleanse the Burn.',
    detail: 'Water and cleansing moves remove statuses. Defense is not only a bigger HP bar.',
    target: 'moves',
    action: 'CLICK ROOM SERVICE',
  },
  {
    id: 'element-result',
    chapter: 8,
    title: 'The eight elements',
    body: 'Fire burns, Poison ticks, Ice chills, Electricity drains Hype, Wind spreads, Earth shields, Water heals and Light protects.',
    detail: 'Every artist has one elemental identity. Read the move before choosing it; the right element can flip a matchup.',
    next: true,
  },
  {
    id: 'feature',
    chapter: 9,
    title: 'Crew chemistry',
    body: 'Macko and Juno are both MIDNIGHT CARTEL. Click FEATURE VERSE to make the whole crew perform together.',
    detail: 'A Feature Verse is once per round and gives the crew a combined hit plus +1 Hype. Stacking a crew is how a set snowballs.',
    target: 'feature',
    action: 'CLICK FEATURE VERSE',
  },
  {
    id: 'feature-result',
    chapter: 9,
    title: 'The crew hit lands',
    body: 'The Feature Verse hit the Headliner’s crowd and gave you +1 Hype. The button is spent until the next round.',
    detail: 'Watch the crowd meter, not only the artist HP bars. Crowd damage is how the show is won.',
    next: true,
  },
  {
    id: 'encore',
    chapter: 9,
    title: 'Encore transformation',
    body: 'You have one Encore charge. Click ENCORE on Macko to transform him into his headline form.',
    detail: 'Encores are big finishers. You earn another charge every third artist you perform.',
    target: 'encore',
    action: 'CLICK ENCORE ON MACKO',
  },
  {
    id: 'encore-result',
    chapter: 9,
    title: 'Headline form',
    body: 'Macko is now in Encore form. The card art, bars and abilities change, and the transformation can decide a close round.',
    detail: 'Encore forms are not free: spend the charge when the room is ready to break, not just because it glows.',
    next: true,
  },
  {
    id: 'final',
    chapter: 10,
    title: 'Take the room',
    body: 'The Headliner’s crowd is almost gone. Click FINAL PERFORMANCE to finish the show and trigger the victory screen.',
    detail: 'In a real match, target the lowest-HP artist first, protect your crew bonus, and save a Clapback for the biggest hit.',
    target: 'final',
    action: 'CLICK FINAL PERFORMANCE',
  },
  {
    id: 'victory',
    chapter: 10,
    title: 'Sold out',
    body: 'You emptied the Headliner’s room and completed the training show. Every chapter is saved on this browser.',
    detail: 'Play a real show when you are ready. The tutorial can be replayed at any time from HOW TO PLAY.',
    next: true,
  },
]

function makeStageCard(artistId: string, uid: string, overrides: Partial<StageCard> = {}): StageCard {
  const artist = getArtist(artistId)
  const stats = battleStatsFor(artist)
  return {
    uid,
    artistId,
    encore: false,
    level: 1,
    hp: stats.hp,
    maxHp: stats.hp,
    shield: 0,
    statuses: [],
    actedThisTurn: false,
    enteredRound: 1,
    untouchableUntil: 0,
    nextAttackBonus: 0,
    defenseBonus: 0,
    guardRound: 0,
    entranceUsed: false,
    comebackBonus: 0,
    comebackUsed: false,
    moves: [],
    specialCharge: 0,
    specialUsed: false,
    ...overrides,
  }
}

function junoMoves() {
  const pool = movesForArtist(JUNO.id)
  return pool.filter((move) => ['-move-0', '-move-2', '-move-4'].some((suffix) => move.id.endsWith(suffix))).map((move) => move.id)
}

function makeJunoCard(): StageCard {
  return makeStageCard(JUNO.id, 'tut-juno', { moves: junoMoves() })
}

function makeKrownBackstage(): BackstageCard {
  const artist = getArtist(KROWN.id)
  return {
    uid: 'tut-krown-backstage',
    artistId: artist.id,
    encore: false,
    level: 1,
    hp: 0,
    maxHp: battleStatsFor(artist).hp,
    moves: movesForArtist(artist.id).slice(0, 3).map((move) => move.id),
  }
}

function readCompleted(): number {
  try {
    const raw = localStorage.getItem(TUTORIAL_KEY)
    if (!raw) return 0
    const value = Number(JSON.parse(raw))
    return Number.isFinite(value) ? Math.max(0, Math.min(10, Math.round(value))) : 0
  } catch {
    return 0
  }
}

function writeCompleted(value: number) {
  try {
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify(value))
  } catch {
    // Training still works with storage disabled.
  }
}

export function Tutorial({ onExit, onPlay }: TutorialProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [completed, setCompleted] = useState(readCompleted)
  const [victory, setVictory] = useState(false)
  const [playerStage, setPlayerStage] = useState<StageCard[]>(() => [
    makeStageCard(MACKO.id, 'tut-macko', { moves: defaultLoadout(MACKO.id) }),
  ])
  const [rivalStage, setRivalStage] = useState<StageCard[]>(() => [
    makeStageCard(PIXEL.id, 'tut-pixel'),
    makeStageCard(SABLE.id, 'tut-sable'),
  ])
  const [backstage, setBackstage] = useState<BackstageCard[]>([])
  const [hand, setHand] = useState<string[]>(TUTORIAL_HAND)
  const [specialHand, setSpecialHand] = useState<{ uid: string; cardId: string; drawnRound: number }[]>([])
  const [crateCount, setCrateCount] = useState(TUTORIAL_CRATE_STACK)
  const [playerCrowd, setPlayerCrowd] = useState(72)
  const [rivalCrowd, setRivalCrowd] = useState(64)
  const [hype, setHype] = useState(24)
  const [round, setRound] = useState(1)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [pendingDeploy, setPendingDeploy] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<Move | null>(null)
  const [defensePrompt, setDefensePrompt] = useState<{ damage: number; attacker: string; target: string } | null>(null)
  const [backstageOpen, setBackstageOpen] = useState(false)
  const [specialOpen, setSpecialOpen] = useState(false)
  const [lastAction, setLastAction] = useState('THE OPENING ACTS ARE LIVE. FILL THE STAGE.')
  const [nudge, setNudge] = useState<string | null>(null)
  const [hit, setHit] = useState<{ side: 'player' | 'rival'; value: number; nonce: number } | null>(null)
  const nudgeTimer = useRef<number | null>(null)
  const step = STEPS[stepIndex]
  const chapter = CHAPTERS[step.chapter - 1]

  const selectedCard = playerStage.find((card) => card.uid === selectedUid) ?? null
  const selectedArtist = selectedCard ? getArtist(selectedCard.artistId) : null
  const selectedMoves = useMemo(
    () =>
      selectedCard
        ? selectedCard.moves.map((id) => moveById(id)).filter((move): move is Move => Boolean(move))
        : [],
    [selectedCard],
  )
  const featureReady = playerStage.filter((card) => getArtist(card.artistId).crew === 'MIDNIGHT CARTEL').length >= 2
  const mackoCard = playerStage.find((card) => card.artistId === MACKO.id) ?? null
  const junoCard = playerStage.find((card) => card.artistId === JUNO.id) ?? null

  useEffect(() => {
    if (!defensePrompt && step.id === 'defense') {
      setDefensePrompt({ damage: 8, attacker: SABLE.name, target: MACKO.name })
    }
  }, [step.id, defensePrompt])

  useEffect(() => {
    if (step.id !== 'backstage' || backstage.length > 0) return
    setBackstage([makeKrownBackstage()])
  }, [step.id, backstage.length])

  useEffect(() => {
    const nextCompleted = victory ? 10 : Math.max(completed, step.chapter - 1)
    if (nextCompleted !== completed) {
      setCompleted(nextCompleted)
      writeCompleted(nextCompleted)
    }
  }, [step.chapter, victory, completed])

  useEffect(() => {
    return () => {
      if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!step.target) return
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector(`[data-tutorial-target="${step.target}"]`)
      target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [stepIndex, step.target])

  useEffect(() => {
    if (step.id === 'element-attack' && mackoCard) {
      setSelectedUid(mackoCard.uid)
      return
    }
    if (
      [
        'offense-result',
        'defense',
        'defense-result',
        'backstage',
        'revive',
        'revive-result',
        'crate',
        'crate-result',
        'special',
        'special-target',
        'special-result',
        'element-result',
        'feature',
        'feature-result',
        'encore',
        'encore-result',
        'final',
        'victory',
      ].includes(step.id)
    ) {
      setSelectedUid(null)
    }
  }, [step.id, mackoCard])

  const focusClass = (id: string) => (step.target === id ? 'is-tutorial-target' : '')

  const showNudge = (message: string) => {
    setNudge(message)
    if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current)
    nudgeTimer.current = window.setTimeout(() => setNudge(null), 2600)
  }

  const applyHit = (side: 'player' | 'rival', value: number) => {
    setHit({ side, value, nonce: Date.now() })
  }

  const advance = () => {
    if (!step.next) return
    if (stepIndex >= STEPS.length - 1) return
    const next = stepIndex + 1
    setStepIndex(next)
    if (STEPS[next].id === 'victory') {
      setVictory(true)
      setCompleted(10)
      writeCompleted(10)
    }
  }

  const selectArtist = (uid: string) => {
    if (step.id === 'select-artist' && uid === 'tut-macko') {
      setSelectedUid(uid)
      setLastAction(`${MACKO.name} SELECTED. THREE MOVES READY.`)
      setStepIndex(6)
      return
    }
    if (step.id === 'special-target' && uid === 'tut-macko') {
      setPlayerStage((stage) =>
        stage.map((card) => (card.uid === uid ? { ...card, nextAttackBonus: card.nextAttackBonus + 2 } : card)),
      )
      setSpecialHand([])
      setSpecialOpen(false)
      setLastAction('HOUSE MIC ARMED. MACKO’S NEXT ATTACK DEALS +2.')
      setStepIndex(18)
      return
    }
    if (step.id === 'element-attack' && uid === 'tut-macko') {
      setSelectedUid(uid)
      return
    }
    if (step.id === 'element-cleanse' && uid === 'tut-juno') {
      setSelectedUid(uid)
      return
    }
    showNudge('Follow the glowing instruction. The guided control is the one that moves the lesson forward.')
  }

  const deployJuno = () => {
    if (step.id !== 'deploy-slot' || !pendingDeploy) return
    if (playerStage.length >= 5) {
      showNudge('The stage is full. In a real match, cut or swap an artist first.')
      return
    }
    setPlayerStage((stage) => [...stage, makeJunoCard()])
    setHand((cards) => cards.filter((id) => id !== JUNO.id))
    setHype((value) => Math.max(0, value - JUNO.cost))
    setPendingDeploy(null)
    setLastAction(`${JUNO.name} DEPLOYED. MIDNIGHT CARTEL IS TWO DEEP.`)
    setStepIndex(3)
  }

  const resolveAttack = (targetUid: string) => {
    if (!pendingMove || step.id !== 'choose-target') return
    const target = rivalStage.find((card) => card.uid === targetUid)
    if (!target) return
    const targetArtist = getArtist(target.artistId)
    const defense = battleStatsFor(targetArtist).defense
    const damage = Math.max(1, pendingMove.power + (mackoCard?.nextAttackBonus ?? 0) - Math.floor(defense / 2))
    setRivalStage((stage) =>
      stage.map((card) =>
        card.uid === targetUid
          ? { ...card, hp: Math.max(0, card.hp - damage), statuses: [] }
          : card,
      ),
    )
    setPlayerStage((stage) =>
      stage.map((card) => (card.uid === 'tut-macko' ? { ...card, actedThisTurn: true, nextAttackBonus: 0 } : card)),
    )
    setHype((value) => Math.max(0, value - pendingMove.cost))
    applyHit('rival', damage)
    setLastAction(`${pendingMove.name} HIT ${targetArtist.name} FOR ${damage}.`)
    setPendingMove(null)
    setStepIndex(8)
  }

  const clickRival = (card: StageCard) => {
    if (step.id === 'choose-target') {
      resolveAttack(card.uid)
      return
    }
    showNudge('The lesson will ask you to pick a target when a move is ready.')
  }

  const playMove = (move: Move) => {
    if (step.id === 'choose-move') {
      if (move.type !== 'attack' || move.element) {
        showNudge('Choose HEAVY TALK for this step. It is the cleanest attack to learn targeting with.')
        return
      }
      setPendingMove(move)
      setLastAction(`${move.name} ARMED. CHOOSE A HEADLINER TARGET.`)
      setStepIndex(7)
      return
    }
    if (step.id === 'element-attack') {
      if (move.element !== 'FIRE') {
        showNudge('Choose SHARP BARS — the Fire move. It is the one that teaches Burn.')
        return
      }
      const target = rivalStage.find((card) => card.artistId === PIXEL.id) ?? rivalStage[0]
      if (!target) return
      const damage = Math.max(1, move.power - Math.floor(battleStatsFor(PIXEL).defense / 2))
      setRivalStage((stage) =>
        stage.map((card) =>
          card.uid === target.uid
            ? {
                ...card,
                hp: Math.max(0, card.hp - damage),
                statuses: [{ kind: 'burn', value: 2, turns: 2 }],
              }
            : card,
        ),
      )
      setPlayerStage((stage) =>
        stage.map((card) =>
          card.uid === 'tut-macko'
            ? { ...card, statuses: [{ kind: 'burn', value: 2, turns: 2 }] }
            : card,
        ),
      )
      applyHit('rival', damage)
      setLastAction(`SHARP BARS BURNED ${PIXEL.name} FOR ${damage}. BURN 2 TURNS. BACKDRAFT SET MACKO BURNING.`)
      setSelectedUid(junoCard?.uid ?? null)
      setStepIndex(20)
      return
    }
    if (step.id === 'element-cleanse') {
      if (!move.effects.some((effect) => effect.cleanse) && move.type !== 'healing') {
        showNudge('Choose ROOM SERVICE. It is the cleanse move that removes Burn.')
        return
      }
      if (!mackoCard) return
      setPlayerStage((stage) =>
        stage.map((card) =>
          card.uid === 'tut-macko'
            ? { ...card, hp: Math.min(card.maxHp, card.hp + 3), statuses: [] }
            : card,
        ),
      )
      setLastAction(`${move.name.toUpperCase()} CLEANSED MACKO AND RESTORED 3 HP.`)
      setStepIndex(21)
      return
    }
    showNudge('The move panel is open for inspection. Follow the coach to choose the next action.')
  }

  const clapback = () => {
    if (step.id !== 'defense') return
    if (!mackoCard) return
    const reduced = Math.ceil((defensePrompt?.damage ?? 8) / 2)
    setPlayerStage((stage) =>
      stage.map((card) => (card.uid === 'tut-macko' ? { ...card, hp: Math.max(1, card.hp - reduced) } : card)),
    )
    setHype((value) => Math.min(24, value + 1))
    applyHit('player', reduced)
    setDefensePrompt(null)
    setLastAction(`CLAPBACK CUT THE HIT TO ${reduced}. +1 HYPE.`)
    setStepIndex(10)
  }

  const openBackstage = () => {
    if (step.id !== 'backstage') return
    setBackstageOpen(true)
    setLastAction('BACKSTAGE OPEN. ONE ARTIST IS ELIGIBLE FOR A CALL BACK.')
    setStepIndex(12)
  }

  const revive = () => {
    if (step.id !== 'revive') return
    const fallen = backstage[0]
    if (!fallen) return
    if (hype < 10) {
      showNudge('Call Back costs 10–15 Hype in a real match. Build the meter first.')
      return
    }
    const revived = makeStageCard(fallen.artistId, 'tut-krown', {
      hp: fallen.maxHp,
      maxHp: fallen.maxHp,
      moves: fallen.moves,
      actedThisTurn: true,
      entranceUsed: true,
    })
    setPlayerStage((stage) => [...stage, revived])
    setBackstage([])
    setBackstageOpen(false)
    setHype((value) => Math.max(0, value - 10))
    setLastAction(`${getArtist(fallen.artistId).name} RETURNED AT FULL HP. ACTION SPENT.`)
    setStepIndex(13)
  }

  const drawCrate = () => {
    if (step.id !== 'crate') return
    setCrateCount((value) => Math.max(0, value - 1))
    setSpecialHand([{ uid: 'tut-special-1', cardId: 'power-2', drawnRound: 1 }])
    setRound(2)
    setPlayerStage((stage) => stage.map((card) => ({ ...card, actedThisTurn: false })))
    setHype((value) => Math.max(0, value - 2))
    setLastAction('HOUSE MIC DRAWN FOR 2 HYPE. YOUR TURN CONTINUES.')
    setStepIndex(15)
  }

  const openSpecial = () => {
    if (step.id !== 'special') return
    setSpecialOpen(true)
    setLastAction('HOUSE MIC SELECTED. CHOOSE MACKO TO CARRY THE BONUS.')
    setStepIndex(17)
  }

  const playFeature = () => {
    if (step.id !== 'feature') return
    if (!featureReady) {
      showNudge('A Feature Verse needs two artists from the same crew on stage.')
      return
    }
    const damage = featureDamage(playerStage, 'MIDNIGHT CARTEL', 1)
    setRivalCrowd((value) => Math.max(0, value - damage))
    setHype((value) => Math.min(24, value + 1))
    applyHit('rival', damage)
    setLastAction(`MIDNIGHT CARTEL FEATURE VERSE: ${damage} CROWD DAMAGE. +1 HYPE.`)
    setStepIndex(23)
  }

  const playEncore = () => {
    if (step.id !== 'encore') return
    if (!mackoCard || mackoCard.encore) {
      showNudge('Macko is already in Encore form.')
      return
    }
    setPlayerStage((stage) =>
      stage.map((card) =>
        card.uid === 'tut-macko'
          ? { ...card, encore: true, maxHp: card.maxHp + 4, hp: Math.min(card.maxHp + 4, card.hp + 4) }
          : card,
      ),
    )
    setLastAction(`${MACKO.name} TRANSFORMED. ENCORE FORM IS LIVE.`)
    setStepIndex(25)
  }

  const finalPerformance = () => {
    if (step.id !== 'final') return
    setRivalCrowd(0)
    setSelectedUid(null)
    setPendingMove(null)
    setLastAction('THE HEADLINER’S ROOM IS EMPTY. THE NIGHT IS YOURS.')
    setVictory(true)
    setCompleted(10)
    writeCompleted(10)
    setStepIndex(STEPS.length - 1)
  }

  const restart = () => {
    setStepIndex(0)
    setVictory(false)
    setPlayerStage([makeStageCard(MACKO.id, 'tut-macko', { moves: defaultLoadout(MACKO.id) })])
    setRivalStage([makeStageCard(PIXEL.id, 'tut-pixel'), makeStageCard(SABLE.id, 'tut-sable')])
    setBackstage([])
    setHand(TUTORIAL_HAND)
    setSpecialHand([])
    setCrateCount(TUTORIAL_CRATE_STACK)
    setPlayerCrowd(72)
    setRivalCrowd(64)
    setHype(12)
    setRound(1)
    setSelectedUid(null)
    setPendingDeploy(null)
    setPendingMove(null)
    setDefensePrompt(null)
    setBackstageOpen(false)
    setSpecialOpen(false)
    setLastAction('THE OPENING ACTS ARE LIVE. FILL THE STAGE.')
    setNudge(null)
    setHit(null)
  }

  const blockUnintended = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (
      target.closest('.tutorial-coach') ||
      target.closest('.tutorial-callout') ||
      target.closest('.tutorial-sidecar') ||
      target.closest('.tutorial-turn') ||
      target.closest('.tutorial-nav') ||
      target.closest('.tutorial-top') ||
      target.closest('.tutorial-victory')
    ) {
      return
    }
    if (!step.target) return
    if (target.closest(`[data-tutorial-target="${step.target}"]`)) return
    event.preventDefault()
    event.stopPropagation()
    showNudge('Follow the glowing control first. The rest of the board is waiting for the lesson.')
  }

  const stepProgress = Math.round(((stepIndex + 1) / STEPS.length) * 100)
  const chapterProgress = Math.round((completed / 10) * 100)
  const specialDefinition = specialHand[0] ? crateCard(specialHand[0].cardId) : null
  const specialRarity = specialDefinition ? RARITY_META[specialDefinition.rarity] : null

  return (
    <div className="tutorial tutorial--soundcheck" data-step={step.id} onMouseDownCapture={blockUnintended} onClickCapture={blockUnintended}>
      <div className="tutorial-venue" aria-hidden="true">
        <div className="tutorial-venue__truss" />
        <div className="tutorial-venue__beam tutorial-venue__beam--one" />
        <div className="tutorial-venue__beam tutorial-venue__beam--two" />
        <div className="tutorial-venue__beam tutorial-venue__beam--three" />
        <div className="tutorial-venue__beam tutorial-venue__beam--four" />
        <div className="tutorial-venue__screen tutorial-venue__screen--left">
          {portraitUrl(PIXEL.id) && <img src={portraitUrl(PIXEL.id)} alt="" />}
          <span>THE HEADLINER</span>
        </div>
        <div className="tutorial-venue__screen tutorial-venue__screen--right">
          {portraitUrl(SABLE.id) && <img src={portraitUrl(SABLE.id)} alt="" />}
          <span>MIDNIGHT GARDEN</span>
        </div>
        <div className="tutorial-venue__speaker tutorial-venue__speaker--left">
          <i /><i /><i /><span>CIKI</span>
        </div>
        <div className="tutorial-venue__speaker tutorial-venue__speaker--right">
          <i /><i /><i /><span>CIKI</span>
        </div>
        <div className="tutorial-venue__floor" />
        <div className="tutorial-venue__crowd">
          {Array.from({ length: 34 }).map((_, index) => (
            <i key={index} style={{ '--i': index } as CSSProperties} />
          ))}
        </div>
        <div className="tutorial-venue__haze" />
        <div className="tutorial-venue__sparks">
          {Array.from({ length: 16 }).map((_, index) => (
            <i key={index} style={{ '--i': index } as CSSProperties} />
          ))}
        </div>
      </div>

      <header className="tutorial-top">
        <button className="link-btn tutorial-exit" onClick={onExit}>
          ← EXIT TRAINING
        </button>
        <div className="tutorial-title">
          <span>HOW TO PLAY</span>
          <b>THE FIRST SHOW</b>
          <i>INTERACTIVE TRAINING · MIDNIGHT GARDEN</i>
        </div>
        <div className="tutorial-progress">
          <span><b>{completed}/10</b> CHAPTERS SAVED</span>
          <div><i style={{ width: `${chapterProgress}%` }} /></div>
        </div>
      </header>

      <div className="tutorial-layout">
        <main className={`tutorial-board ${step.target ? 'is-guided' : ''}`} aria-label="Guided practice match">
          <div className="tutorial-board__ambient" aria-hidden="true">
            <div className="tutorial-board__led tutorial-board__led--left">
              {portraitUrl(PIXEL.id) && <img src={portraitUrl(PIXEL.id)} alt="" />}
              <span>THE HEADLINER</span>
            </div>
            <div className="tutorial-board__led tutorial-board__led--right">
              {portraitUrl(SABLE.id) && <img src={portraitUrl(SABLE.id)} alt="" />}
              <span>MIDNIGHT GARDEN</span>
            </div>
            <div className="tutorial-board__lasers" />
          </div>
          <div className="tutorial-hud">
            <div className="tutorial-hud__crowd-art tutorial-hud__crowd-art--left" aria-hidden="true" />
            <div className="tutorial-hud__crowd-art tutorial-hud__crowd-art--right" aria-hidden="true" />
            <div className="tutorial-crowd tutorial-crowd--you">
              <span>YOUR CROWD</span>
              <b>{playerCrowd}</b>
              <i>/72</i>
              <div><span style={{ width: `${(playerCrowd / 72) * 100}%` }} /></div>
              <em>THE ROOM IS YOURS</em>
            </div>
            <div className="tutorial-round">
              <span>ROUND</span>
              <b>{String(round).padStart(2, '0')}</b>
              <i>/12</i>
              <em>ERA I · OPENING ACT</em>
            </div>
            <div className="tutorial-crowd tutorial-crowd--rival">
              <span>THEIR CROWD</span>
              <b>{rivalCrowd}</b>
              <i>/64</i>
              <div><span style={{ width: `${(rivalCrowd / 64) * 100}%` }} /></div>
              <em>THE HEADLINER</em>
            </div>
            {hit && (
              <span key={hit.nonce} className={`tutorial-hit tutorial-hit--${hit.side}`}>
                −{hit.value}
              </span>
            )}
          </div>

          <section className="tutorial-callout" aria-label="Tutorial coach">
            <div className="tutorial-callout__eyebrow">
              <span>CHAPTER {String(chapter.number).padStart(2, '0')} / 10</span>
              <i>{chapter.title}</i>
              <em>{stepProgress}%</em>
            </div>
            <h2>{step.title}</h2>
            <p className="tutorial-callout__body">{step.body}</p>
            {step.detail && <p className="tutorial-callout__detail">{step.detail}</p>}
            <div className="tutorial-callout__prompt">
              <GameIcon name="spark" />
              <span>{step.action ?? 'READ THE LESSON, THEN CONTINUE.'}</span>
            </div>
            {nudge && <p className="tutorial-coach__nudge">{nudge}</p>}
            <span className="tutorial-callout__step">STEP {stepIndex + 1} OF {STEPS.length}</span>
            <svg className="tutorial-callout__arrow" viewBox="0 0 150 150" aria-hidden="true">
              <path d="M132 12c-47 4-80 26-96 63-10 23-9 42-2 62" />
              <path d="m18 115 15 28 19-22" />
            </svg>
          </section>

          <aside className="tutorial-sidecar" aria-label="Performance controls">
            <button
              className={`tutorial-hype ${focusClass('hype')}`}
              data-tutorial-target="hype"
              onClick={() => {
                if (step.id !== 'hype') {
                  showNudge('Hype is the cost of every card and every move. Follow the coach.')
                  return
                }
                setLastAction(`HYPE ${hype}. ATTACKS ARE FREE. +3 EACH TURN. CAP 24.`)
                setStepIndex(5)
              }}
              aria-label={`Hype ${hype}`}
            >
              <GameIcon name="bolt" />
              <span>HYPE</span>
              <b>{String(hype).padStart(2, '0')}</b>
              <i>/24</i>
              <div className="tutorial-hype__ticks">
                {Array.from({ length: 24 }).map((_, index) => (
                  <em key={index} className={index < hype ? 'is-lit' : ''} />
                ))}
              </div>
            </button>
            <div className="tutorial-era">
              <GameIcon name="play" />
              <span>ERA POWER</span>
              <b>OPENING ACT</b>
              <div><i /><i /><i /></div>
            </div>
            <button
              className={`tutorial-action tutorial-action--feature ${focusClass('feature')} ${featureReady ? 'is-ready' : ''}`}
              data-tutorial-target="feature"
              onClick={playFeature}
            >
              <GameIcon name="spark" />
              <span><b>FEATURE VERSE</b><em>MIDNIGHT CARTEL</em></span>
              <strong>{featureReady ? 'READY' : '2 CREW'}</strong>
            </button>
            <button
              className={`tutorial-action ${focusClass('encore')}`}
              data-tutorial-target="encore"
              onClick={playEncore}
              disabled={Boolean(mackoCard?.encore)}
            >
              <GameIcon name="star" />
              <span><b>ENCORE</b><em>MACKO · 1 CHARGE</em></span>
              <strong>{mackoCard?.encore ? 'LIVE' : '1'}</strong>
            </button>
          </aside>

          <section className="tutorial-side tutorial-side--rival">
            <header>
              <span><i className="tutorial-dot tutorial-dot--rival" />THE HEADLINER</span>
              <b>{rivalStage.length}/5 LIVE · {SABLE.name} · {PIXEL.name}</b>
            </header>
            <div className="tutorial-stage">
              {rivalStage.map((card) => (
                <StageUnit
                  key={card.uid}
                  artist={getArtist(card.artistId)}
                  card={card}
                  era={1}
                  targetable
                  targeted={step.id === 'choose-target'}
                  onClick={() => clickRival(card)}
                  className={focusClass('enemy')}
                  tutorialTarget="enemy"
                />
              ))}
              {Array.from({ length: 5 - rivalStage.length }).map((_, index) => (
                <div className="tutorial-slot" key={`rival-empty-${index}`}>
                  <span>SLOT {rivalStage.length + index + 1}</span>
                  <b>+</b>
                  <i>EMPTY</i>
                </div>
              ))}
            </div>
          </section>

          <div className="tutorial-clash">
            <span className="tutorial-live"><i /> LIVE</span>
            <p>{lastAction}</p>
            <span>ERA I · OPENING ACT</span>
          </div>

          <section className="tutorial-side tutorial-side--player">
            <header>
              <span><i className="tutorial-dot tutorial-dot--you" />YOUR SET</span>
              <b>{playerStage.length}/5 LIVE · {hand.length} IN HAND · {backstage.length} BACKSTAGE</b>
            </header>
            <div className="tutorial-stage">
              {playerStage.map((card) => (
                <StageUnit
                  key={card.uid}
                  artist={getArtist(card.artistId)}
                  card={card}
                  era={1}
                  selected={selectedUid === card.uid}
                  onClick={() => {
                    if (step.id === 'select-artist' || step.id === 'element-attack' || step.id === 'element-cleanse') {
                      selectArtist(card.uid)
                    } else if (step.id === 'special-target') {
                      selectArtist(card.uid)
                    } else {
                      setSelectedUid(card.uid)
                    }
                  }}
                  className={focusClass(card.artistId === MACKO.id ? 'macko' : 'juno')}
                  tutorialTarget={card.artistId === MACKO.id ? 'macko' : 'juno'}
                />
              ))}
              {Array.from({ length: 5 - playerStage.length }).map((_, index) => (
                <button
                  className={`tutorial-slot tutorial-slot--open ${focusClass('player-slot')}`}
                  key={`player-empty-${index}`}
                  data-tutorial-target="player-slot"
                  onClick={deployJuno}
                >
                  <span>LIVE SLOT {playerStage.length + index + 1}</span>
                  <b>+</b>
                  <i>OPEN</i>
                </button>
              ))}
            </div>
          </section>

          <div className="tutorial-console">
          <div className="tutorial-dock">
            <div className="tutorial-hand">
              <span className="tutorial-label">YOUR HAND · {hand.length}</span>
              <div>
                {hand.map((artistId) => {
                  const artist = getArtist(artistId)
                  const isTarget = step.id === 'deploy-card' && artistId === JUNO.id
                  return (
                    <div
                      key={artistId}
                      data-tutorial-target="hand"
                      className={`tutorial-hand__card ${isTarget ? 'is-tutorial-target' : ''}`}
                    >
                      <Card
                        artist={artist}
                        size="hand"
                        disabled={!isTarget}
                        onClick={() => {
                          if (!isTarget) {
                            showNudge('The hand is waiting. Follow the current instruction.')
                            return
                          }
                          setPendingDeploy(artistId)
                          setLastAction(`${artist.name} SELECTED. CHOOSE AN OPEN LIVE SLOT.`)
                          setStepIndex(2)
                        }}
                      />
                    </div>
                  )
                })}
                {hand.length === 0 && <span className="tutorial-empty">NO CARDS IN HAND</span>}
              </div>
            </div>

            <div className="tutorial-crate">
              <button
                className={`tutorial-crate__draw ${focusClass('crate')}`}
                data-tutorial-target="crate"
                onClick={drawCrate}
              >
                <span className="tutorial-crate__record" aria-hidden="true"><i /></span>
                <span>
                  <b>THE CRATE</b>
                  <em>{crateCount} IN STACK</em>
                  <strong>DRAW FROM THE CRATE</strong>
                  <i>ENDS TURN</i>
                </span>
              </button>
              <div className={`tutorial-special ${step.id === 'special' ? 'is-pick-source' : ''}`}>
                <span className="tutorial-label">SPECIAL HAND · {specialHand.length}/6</span>
                {specialHand.length === 0 ? (
                  <span className="tutorial-empty">NO SPECIALS HELD</span>
                ) : (
                  specialHand.map((card) => {
                    const def = crateCard(card.cardId)
                    const rarity = RARITY_META[def.rarity]
                    return (
                      <button
                        key={card.uid}
                        className={`tutorial-special__card ${focusClass('special')}`}
                        data-tutorial-target={step.id === 'special' ? undefined : 'special'}
                        style={{ '--rarity': rarity.color } as CSSProperties}
                        onClick={openSpecial}
                      >
                        <span>{def.rarity}</span>
                        <b>{def.name}</b>
                        <i>{CATEGORY_LABEL[def.category]} · READY</i>
                      </button>
                    )
                  })
                )}
              </div>
              <button
                className={`tutorial-backstage ${focusClass('backstage')}`}
                data-tutorial-target="backstage"
                onClick={openBackstage}
              >
                <GameIcon name="backstage" />
                <b>{backstage.length}</b>
                <span>BACKSTAGE</span>
                <i>VIEW</i>
              </button>
            </div>
          </div>
          {step.id === 'final' ? (
            <button
              className={`tutorial-turn tutorial-turn--final ${focusClass('final')}`}
              data-tutorial-target="final"
              onClick={finalPerformance}
            >
              <span className="tutorial-turn__record" aria-hidden="true"><i /></span>
              <b>FINAL PERFORMANCE</b>
              <em>EMPTY THE HEADLINER’S ROOM</em>
            </button>
          ) : (
            <button
              className="tutorial-turn"
              onClick={() => showNudge('In a real match, END TURN passes the room to the Headliner and refills 2 Hype.')}
            >
              <span className="tutorial-turn__record" aria-hidden="true"><i /></span>
              <b>END TURN</b>
              <em>PASS THE ROOM · SPACE</em>
            </button>
          )}
          </div>

          <div className="tutorial-board__pit" aria-hidden="true">
            <span>SOLD OUT · THE MIDNIGHT GARDEN</span>
            {Array.from({ length: 28 }).map((_, index) => (
              <i key={index} style={{ '--i': index } as CSSProperties} />
            ))}
          </div>

          <footer className="tutorial-nav">
            <button className="tutorial-nav__button" onClick={restart}>
              <GameIcon name="play" /> REPLAY
            </button>
            <div className="tutorial-nav__dots" aria-label={`${completed} of 10 chapters complete`}>
              {CHAPTERS.map((item) => (
                <i
                  key={item.number}
                  className={`${completed >= item.number ? 'is-done' : ''} ${item.number === chapter.number ? 'is-current' : ''}`}
                />
              ))}
            </div>
            <span className="tutorial-nav__count">STEP {stepIndex + 1} / {STEPS.length}</span>
            <button className="tutorial-nav__button" onClick={onExit}>SKIP TUTORIAL</button>
            {step.next ? (
              <button className="btn btn--primary tutorial-coach__next tutorial-nav__next" onClick={advance}>
                {stepIndex >= STEPS.length - 1 ? 'REPLAY THE SHOW' : 'NEXT STEP'}
                <GameIcon name="chevron" />
              </button>
            ) : (
              <span className="tutorial-nav__wait">COMPLETE THE HIGHLIGHTED ACTION</span>
            )}
          </footer>

          {selectedCard && selectedArtist && (
            <section
              className={`tutorial-moves ${focusClass('moves')}`}
              data-tutorial-target="moves"
              aria-label={`${selectedArtist.name} moves`}
            >
              <header>
                <div>
                  <span className="tutorial-label">SELECTED ARTIST · {selectedArtist.name}</span>
                  <b>{selectedCard.hp}/{selectedCard.maxHp} HP · {hype} HYPE · {selectedCard.actedThisTurn ? 'ACTION SPENT' : 'READY'}</b>
                </div>
                <span className="tutorial-moves__element" style={{ color: ELEMENT_META[selectedArtist.battle.element].color }}>
                  {ELEMENT_META[selectedArtist.battle.element].icon} {ELEMENT_META[selectedArtist.battle.element].label}
                </span>
                <button className="icon-btn" onClick={() => setSelectedUid(null)} aria-label="Close moves">
                  <GameIcon name="close" />
                </button>
              </header>
              <div className="tutorial-moves__grid">
                {selectedMoves.map((move, index) => {
                  const element = move.element ? ELEMENT_META[move.element] : null
                  const moveCost = isAttackMove(move) ? 0 : move.cost
                  const disabled = selectedCard.actedThisTurn || hype < moveCost
                  return (
                    <button
                      key={move.id}
                      className={`tutorial-move ${focusClass('moves')}`}
                      onClick={() => playMove(move)}
                      disabled={
                        disabled ||
                        (step.id !== 'choose-move' && step.id !== 'element-attack' && step.id !== 'element-cleanse')
                      }
                    >
                      <span className="tutorial-move__slot">MOVE {index + 1}</span>
                      <span className="tutorial-move__type" style={element ? { color: element.color } : undefined}>
                        {element ? `${element.icon} ${move.type.toUpperCase()}` : move.type.toUpperCase()}
                      </span>
                      <b>{move.name}</b>
                      <p>{move.description}</p>
                      <span className="tutorial-move__foot">
                        <em>{isAttackMove(move) ? 'FREE ATTACK' : `${moveCost} HYPE`}</em>
                        {disabled && <i>{selectedCard.actedThisTurn ? 'ACTION SPENT' : 'NOT ENOUGH HYPE'}</i>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {defensePrompt && (
            <div className="tutorial-defense" role="alertdialog" aria-label="Defensive window">
              <span className="tutorial-defense__kicker">DEFENSIVE WINDOW · 2 CLAPBACKS LEFT</span>
              <h3>{defensePrompt.attacker} IS COMING FOR {defensePrompt.target}.</h3>
              <p>Cut the hit in half and gain +1 Hype. This is the moment to use a Clapback.</p>
              <div className="tutorial-defense__damage">
                <b>{defensePrompt.damage}</b>
                <span>INCOMING DAMAGE</span>
              </div>
              <button
                className={`tutorial-defense__clap ${focusClass('defense')}`}
                data-tutorial-target="defense"
                onClick={clapback}
              >
                CLAPBACK → {Math.ceil(defensePrompt.damage / 2)}
              </button>
              <small>Correct play: halve the damage. The coach will not advance until you do.</small>
            </div>
          )}

          {step.id === 'special' && specialDefinition && specialRarity && (
            <div className="tutorial-special-pick" role="dialog" aria-label="Special card ready">
              <span className="tutorial-special-pick__kicker">
                SPECIAL CARD READY · {specialDefinition.rarity}
              </span>
              <h3>{specialDefinition.name}</h3>
              <p>{specialDefinition.description}</p>
              <button
                className="tutorial-special-pick__card"
                data-tutorial-target="special"
                style={{ '--rarity': specialRarity.color } as CSSProperties}
                onClick={openSpecial}
              >
                <span>SPECIAL HAND · 1/6</span>
                <b>{specialDefinition.name}</b>
                <i>{CATEGORY_LABEL[specialDefinition.category]} · TAP TO PULL IT OUT</i>
              </button>
            </div>
          )}

          {specialOpen && specialDefinition && specialRarity && (
            <div className="tutorial-special-focus" style={{ '--rarity': specialRarity.color } as CSSProperties}>
              <div>
                <span>SPECIAL CARD READY · {specialDefinition.rarity}</span>
                <h3>{specialDefinition.name}</h3>
                <p>{specialDefinition.description}</p>
              </div>
              <span className="tutorial-special-focus__target">TARGET: CLICK MACKO ON STAGE</span>
            </div>
          )}
        </main>

        <aside className="tutorial-coach" aria-label="Sound Check chapters">
          <div className="tutorial-rail__brand">
            <BrandLogo />
            <div className="tutorial-rail__wordmark">
              <span>THE</span>
              <b>SOUND CHECK</b>
              <i>OFFICIAL GAME TUTORIAL</i>
            </div>
            <button className="tutorial-rail__exit" onClick={onExit} aria-label="Exit training">
              <GameIcon name="close" />
            </button>
          </div>
          <div className="tutorial-rail__progress">
            <span><b>{completed}/10</b> CHAPTERS COMPLETE</span>
            <div><i style={{ width: `${chapterProgress}%` }} /></div>
          </div>
          <div className="tutorial-coach__chapter">
            <span>CHAPTER {String(chapter.number).padStart(2, '0')} / 10</span>
            <i>{stepProgress}% LESSON COMPLETE</i>
          </div>
          <div className="tutorial-rail__list-label"><span>THE PROGRAM</span><i>10 CHAPTERS</i></div>
          <h1>{chapter.title}</h1>
          <p className="tutorial-coach__subtitle">{chapter.subtitle}</p>
          <div className="tutorial-coach__rule" />
          <span className="tutorial-coach__step">
            STEP {stepIndex + 1} OF {STEPS.length}
          </span>
          <h2>{step.title}</h2>
          <p className="tutorial-coach__body">{step.body}</p>
          {step.detail && <p className="tutorial-coach__detail">{step.detail}</p>}

          {step.next ? (
            <button className="btn btn--primary tutorial-coach__next" onClick={advance} data-gamepad-primary>
              {stepIndex >= STEPS.length - 1 ? 'REPLAY THE SHOW' : 'CONTINUE'}
              <GameIcon name="chevron" />
            </button>
          ) : (
            <div className="tutorial-coach__action">
              <GameIcon name="spark" />
              <span>{step.action}</span>
            </div>
          )}

          {nudge && <p className="tutorial-coach__nudge">{nudge}</p>}

          <div className="tutorial-chapters">
            {CHAPTERS.map((item) => {
              const isDone = completed >= item.number
              const isCurrent = item.number === chapter.number
              return (
                <div
                  key={item.number}
                  className={`tutorial-chapter-pill ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span>{isDone ? '✓' : String(item.number).padStart(2, '0')}</span>
                  <div>
                    <b>{item.title}</b>
                    <i>{item.subtitle}</i>
                  </div>
                  {isCurrent && <em>NOW</em>}
                </div>
              )
            })}
          </div>

          <div className="tutorial-rail__reward">
            <span className="tutorial-rail__reward-art" aria-hidden="true"><b>CIKI</b><i>★</i></span>
            <div>
              <span>TUTORIAL REWARD</span>
              <b>SOUND CHECK BADGE</b>
              <i>{completed}/10 LESSONS SAVED</i>
            </div>
          </div>

          <div className="tutorial-coach__foot">
            <button className="link-btn" onClick={restart}>RESTART</button>
            <button className="link-btn" onClick={onExit}>SKIP TUTORIAL</button>
            <span>SAVED LOCALLY</span>
          </div>

          <div className="tutorial-rail__host">
            <div className="tutorial-rail__host-copy">
              <span>YOUR HOST</span>
              <b>CASSO ROYALE</b>
              <i>“Welcome to the Midnight Garden.”</i>
            </div>
            <Portrait artist={HOST} crop="avatar" />
          </div>
        </aside>
      </div>

      {backstageOpen && (
        <div className="modal tutorial-backstage-modal" role="dialog" aria-modal="true" aria-label="Backstage">
          <button className="modal__scrim" onClick={() => setBackstageOpen(false)} aria-label="Close backstage" />
          <div className="modal__panel tutorial-backstage-panel">
            <header className="modal__head">
              <div>
                <span className="kicker">DEFEATED ARTISTS · {backstage.length} WAITING</span>
                <h2>BACKSTAGE</h2>
              </div>
              <button className="icon-btn" onClick={() => setBackstageOpen(false)} aria-label="Close backstage">
                <GameIcon name="close" />
              </button>
            </header>
            {backstage.length === 0 ? (
              <p className="tutorial-empty">Nobody is backstage. Your set is intact.</p>
            ) : (
              backstage.map((card) => {
                const artist = getArtist(card.artistId)
                return (
                  <div className="tutorial-backstage-row" key={card.uid}>
                    <span className="tutorial-backstage-row__portrait"><Portrait artist={artist} crop="avatar" /></span>
                    <div>
                      <b>{artist.name}</b>
                      <i>{card.maxHp} MAX HP · {artist.crew} · {card.moves.map((id) => moveById(id)?.name).filter(Boolean).join(' · ')}</i>
                    </div>
                    <button
                      className={`btn btn--primary ${focusClass('revive')}`}
                      data-tutorial-target="revive"
                      onClick={revive}
                      disabled={hype < 10}
                    >
                      CALL BACK ON STAGE
                      <span>10 HYPE</span>
                    </button>
                  </div>
                )
              })
            )}
            <p className="tutorial-backstage-note">
              Call Back restores full HP and cannot attack immediately. One revival per match.
            </p>
          </div>
        </div>
      )}

      {victory && (
        <div className="tutorial-victory" role="dialog" aria-modal="true" aria-label="Tutorial complete">
          <div className="tutorial-victory__burst" aria-hidden="true" />
          <span className="tutorial-victory__kicker">TRAINING COMPLETE · CHAPTER 10</span>
          <h2>SOLD OUT.</h2>
          <p>You emptied the Headliner’s room. You now know how to deploy, attack, defend, revive, draw from the Crate and close a show.</p>
          <div className="tutorial-victory__stats">
            <div><span>CHAPTERS</span><b>10/10</b></div>
            <div><span>CROWD LEFT</span><b>{playerCrowd}</b></div>
            <div><span>DAMAGE DEALT</span><b>{72 - rivalCrowd + 9}</b></div>
            <div><span>REVIVALS</span><b>1</b></div>
          </div>
          <div className="tutorial-victory__actions">
            <button className="btn btn--primary" onClick={onPlay}>PLAY A REAL SHOW</button>
            <button className="btn btn--ghost" onClick={restart}>REPLAY TUTORIAL</button>
            <button className="link-btn" onClick={onExit}>MAIN MENU</button>
          </div>
        </div>
      )}
    </div>
  )
}
