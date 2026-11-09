import { battleReducer, createBattle, CRATE_HYPE_COST, HYPE_CAP } from '../src/game/battle'
import { ARTISTS } from '../src/game/roster'
import {
  battleFormatById,
  customHouseRules,
  generateShuffleRules,
  houseRulesValidationError,
  standardHouseRules,
  type BattleFormatId,
  type ShuffleChaos,
} from '../src/game/house-rules'

const deck = ARTISTS.slice(0, 26).map((artist) => artist.id)
let checks = 0
function check(condition: unknown, message: string) {
  checks += 1
  if (!condition) throw new Error(message)
}

function make(rules = standardHouseRules()) {
  return createBattle({ deck, difficulty: 'HEADLINER', online: true, onlineMode: 'casual', houseRules: rules })
}

const standard = make()
check(standard.houseRules?.preset === 'standard', 'standard preset missing')
check(standard.player.maxCrowd === 72, 'standard crowd changed')
check(standard.player.specialHand.length === 0, 'standard crate changed')

const bigStage = make(customHouseRules('1v1', ['big-stage']))
check(bigStage.player.maxCrowd === Math.round(standard.player.maxCrowd * 1.25), 'big stage player crowd not 125%')
check(bigStage.rival.maxCrowd === Math.round(standard.rival.maxCrowd * 1.25), 'big stage rival crowd not 125%')

const baseHype = standard.player.hype
const hypeSurge = make(customHouseRules('1v1', ['hype-surge']))
check(hypeSurge.player.hype === Math.min(HYPE_CAP, baseHype + 1), 'hype surge start-of-turn failed')

const frenzy = make(customHouseRules('1v1', ['crate-frenzy']))
check(frenzy.player.specialHand.length === 1, 'crate frenzy free draw failed')
check(frenzy.player.hype === baseHype, 'crate frenzy charged Hype')
check(frenzy.player.crateDraws === 1, 'crate frenzy draw count failed')

const lockdown = make(customHouseRules('1v1', ['crate-lockdown']))
const lockdownAfterDraw = battleReducer(lockdown, { type: 'DRAW_CRATE' })
check(lockdownAfterDraw === lockdown, 'crate lockdown still allowed a draw')
check(lockdown.player.specialHand.length === 0, 'crate lockdown gave a card')

const normalDraw = battleReducer(make(), { type: 'DRAW_CRATE' })
check(normalDraw !== undefined, 'normal crate draw failed')
check(normalDraw.player.hype === baseHype - CRATE_HYPE_COST, 'normal crate cost changed')

for (const format of ['1v1', '2v2', 'triple-threat', 'fatal-4'] as BattleFormatId[]) {
  if (battleFormatById(format).enabled) continue
  check(houseRulesValidationError(standardHouseRules(format)) !== null, `${format} should be locked`)
}

check(
  houseRulesValidationError({ ...customHouseRules('1v1', ['hype-surge']), modifiers: ['hype-surge', 'crate-frenzy', 'crate-lockdown'] }) !== null,
  'conflicting modifiers were accepted',
)

for (const chaos of ['low', 'mayhem', 'full'] as ShuffleChaos[]) {
  for (let seedIndex = 0; seedIndex < 250; seedIndex += 1) {
    const rules = generateShuffleRules(chaos, '1v1', `check-${chaos}-${seedIndex}`)
    check(houseRulesValidationError(rules) === null, `shuffle ${chaos} generated invalid rules`)
    check(rules.modifiers.length <= (chaos === 'low' ? 1 : chaos === 'mayhem' ? 2 : 3), 'shuffle count exceeded chaos cap')
    check(new Set(rules.modifiers).size === rules.modifiers.length, 'shuffle duplicated a modifier')
  }
}

const clone = battleReducer(frenzy, { type: 'END_TURN' })
check(clone.houseRuleRuntime !== undefined, 'runtime was lost across reducer clone')
check(clone.houseRuleRuntime !== frenzy.houseRuleRuntime, 'runtime was not deep cloned')

console.log(`house-rules-check: ${checks} checks passed`)
