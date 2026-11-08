import { useMemo, type CSSProperties } from 'react'
import type { Crew, Difficulty, Element, Genre } from '../game/types'
import { ELEMENT_META, ELEMENT_ORDER } from '../game/moves'
import { careerPreset } from '../game/career-presets'
import { DIFFICULTIES } from '../game/themes'
import {
  CAREER_CREW_BY_GENRE,
  CAREER_CREWS,
  CAREER_HOMETOWNS,
  CAREER_STARTER_DECKS,
  CAREER_STARTING_AP,
  CAREER_TITLE,
  careerChapter,
  careerGenreElement,
  finalizeCareerDraft,
  syncCareer,
  type CareerState,
} from '../game/career'
import { CareerCardPanel } from './CareerCardPanel'
import { CareerPresetArt } from './CareerPresetArt'
import { CareerPresetPicker } from './CareerPresetPicker'

const STEP_LABELS = ['ARTIST', 'NAME', 'CARD', 'CONFIRM']

export function CareerCreator({
  draft,
  setDraft,
  step,
  setStep,
  onFinalize,
  onLaunch,
  onCancel,
}: {
  draft: CareerState
  setDraft: (career: CareerState) => void
  step: number
  setStep: (step: number) => void
  onFinalize: (career: CareerState) => void
  onLaunch: (career: CareerState) => void
  onCancel: () => void
}) {
  const selected = careerPreset(draft.presetId)
  const canName = draft.stageName.trim().length >= 2
  const home = CAREER_HOMETOWNS.find((item) => item.id === draft.hometownId) ?? CAREER_HOMETOWNS[0]
  const element = ELEMENT_META[draft.element]
  const chapter = careerChapter(draft.genre, 1)
  const preview = useMemo(
    () => ({ ...draft, stageName: draft.stageName.trim() || 'YOUR ARTIST' }),
    [draft],
  )

  const changePreset = (presetId: string) => {
    if (presetId === draft.presetId) return
    setDraft({ ...draft, presetId: presetId as CareerState['presetId'] })
  }

  const chooseGenre = (genre: Genre) => {
    const defaultCrew = draft.crew === CAREER_CREW_BY_GENRE[draft.genre]
    const defaultElement = draft.element === careerGenreElement(draft.genre)
    setDraft({
      ...draft,
      genre,
      crew: defaultCrew ? CAREER_CREW_BY_GENRE[genre] : draft.crew,
      element: defaultElement ? careerGenreElement(genre) : draft.element,
    })
  }

  const chooseElement = (element: Element) => {
    setDraft({ ...draft, element })
  }

  const chooseHometown = (hometownId: string) => {
    const home = CAREER_HOMETOWNS.find((item) => item.id === hometownId) ?? CAREER_HOMETOWNS[0]
    setDraft({ ...draft, hometownId: home.id, region: home.region })
  }

  const chooseCrew = (crew: Crew) => {
    setDraft({ ...draft, crew })
  }

  const chooseDifficulty = (careerDifficulty: Difficulty) => {
    setDraft({ ...draft, careerDifficulty })
  }

  const confirm = () => {
    if (!canName) return
    const finalized = finalizeCareerDraft(draft)
    setDraft(finalized)
    onFinalize(finalized)
    setStep(3)
  }

  const launch = () => {
    const finalized = finalizeCareerDraft(draft)
    onFinalize(finalized)
    onLaunch(finalized)
  }

  return (
    <main className="subscreen career career--studio">
      <header className="subpage__top career-top">
        <button className="link-btn" onClick={onCancel}>← MY ARTIST CAREER</button>
        <span className="subpage__crumb">NEW CAREER · {CAREER_TITLE}</span>
        <div className="subpage__actions">
          <span className="career-studio__ready">12/12 MODELS READY</span>
        </div>
      </header>

      <div className="career-wizard__steps" aria-label="Career creation steps">
        {STEP_LABELS.map((label, index) => (
          <button
            key={label}
            className={index === step ? 'is-on' : index < step ? 'is-done' : ''}
            disabled={index > 2 || (index > 1 && !canName)}
            onClick={() => index <= 2 && setStep(index)}
            aria-current={index === step}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="career-studio">
        <aside className="career-studio__roster">
          <CareerPresetPicker
            value={draft.presetId}
            onChange={changePreset}
            compact
          />
        </aside>

        <section className="career-studio__stage">
          <div className="career-creator-stage">
            <div className="career-creator-stage__floor" />
            <div className="career-creator-stage__portrait">
              <CareerPresetArt presetId={draft.presetId} mode="full" />
            </div>
            <span className="career-creator-stage__tag">
              {draft.stageName || 'YOUR ARTIST'} · {selected.label} · {element.icon} {element.label} · 50 OVR
            </span>
          </div>
          <div className="career-studio__stage-meta">
            <span>{draft.genre} · {element.icon} {element.label}</span>
            <span>{home.city}, {home.region}</span>
            <span>HD MODEL READY</span>
          </div>
          <div className="career-angle-row">
            <button
              onClick={() => {
                if (step === 0) setStep(1)
                else if (step === 1 && canName) setStep(2)
                else if (step === 2) confirm()
              }}
              disabled={step === 3 || (step === 1 && !canName)}
            >
              {step === 0 ? 'NAME THIS ARTIST →' : step === 1 ? 'PREVIEW CARD →' : step === 2 ? 'CONFIRM ARTIST →' : 'READY TO START'}
            </button>
          </div>
        </section>

        <section className="career-studio__panel">
          {step === 0 && (
            <div className="career-form career-form--studio">
              <p className="kicker">01 · SELECT YOUR ARTIST</p>
              <h1>PICK YOUR<br /><em>MODEL</em></h1>
              <p className="career-studio__lead">
                Six male and six female premade artists. The model sets the face, fit and silhouette;
                you choose the name, sound, city and elemental lane.
              </p>
              <div className="career-studio__summary">
                <div><span>SELECTED</span><b>{selected.label}</b></div>
                <div><span>STARTING OVR</span><b>50</b></div>
                <div><span>ARTWORK</span><b>READY</b></div>
              </div>
              <p className="career-note">
                Every model starts at level 1 and 50 OVR, with the same career move pool and badge eligibility.
                No model has a gameplay advantage.
              </p>
              <button className="btn btn--primary btn--wide" onClick={() => setStep(1)}>CONTINUE TO STAGE NAME →</button>
            </div>
          )}

          {step === 1 && (
            <div className="career-form career-form--studio">
              <p className="kicker">02 · ENTER STAGE NAME</p>
              <h1>WHAT DO THEY<br /><em>CALL YOU?</em></h1>
              <label className="career-field">
                <span>STAGE NAME</span>
                <input
                  value={draft.stageName}
                  maxLength={20}
                  autoFocus
                  placeholder="TYPE YOUR STAGE NAME"
                  onChange={(event) => setDraft({ ...draft, stageName: event.target.value })}
                />
                <i>{draft.stageName.length}/20</i>
              </label>
              <div className="career-name-ideas">
                {['NOVA GREY', 'YOUNG STATIC', 'MISS MEMORY', 'K. SOLO'].map((name) => (
                  <button key={name} onClick={() => setDraft({ ...draft, stageName: name })}>{name}</button>
                ))}
              </div>

              <div className="career-studio__field">
                <span>GENRE PATH</span>
                <div className="career-studio__choices">
                  {(['HIP-HOP', 'R&B', 'POP'] as Genre[]).map((genre) => (
                    <button key={genre} className={draft.genre === genre ? 'is-on' : ''} onClick={() => chooseGenre(genre)}>
                      <b>{genre}</b>
                      <i>{genre === 'HIP-HOP' ? 'BARS +8' : genre === 'R&B' ? 'HOOKS +8' : 'STAGE +8'} · 50 OVR</i>
                    </button>
                  ))}
                </div>
              </div>

              <div className="career-studio__field">
                <span>ELEMENT ATTACK · EIGHT ELEMENTS · FREE CREATION PICK</span>
                <div className="career-studio__choices career-studio__choices--element">
                  {ELEMENT_ORDER.map((elementId) => {
                    const meta = ELEMENT_META[elementId]
                    return (
                      <button
                        key={elementId}
                        className={draft.element === elementId ? 'is-on' : ''}
                        style={{ '--element-color': meta.color } as CSSProperties}
                        onClick={() => chooseElement(elementId)}
                      >
                        <b>{meta.icon} {meta.label}</b>
                        <i>{meta.theme}</i>
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="career-studio__field">
                <span>HOME STATE · ALL 50 STATES + D.C.</span>
                <select value={draft.hometownId} onChange={(event) => chooseHometown(event.target.value)}>
                  {CAREER_HOMETOWNS.map((item) => (
                    <option key={item.id} value={item.id}>{item.region} · {item.city}</option>
                  ))}
                </select>
              </label>

              <div className="career-studio__field">
                <span>CREW AFFILIATION</span>
                <div className="career-studio__choices career-studio__choices--crew">
                  {CAREER_CREWS.map((crew) => (
                    <button key={crew} className={draft.crew === crew ? 'is-on' : ''} onClick={() => chooseCrew(crew)}>
                      <b>{crew}</b>
                      <i>{crew === CAREER_CREW_BY_GENRE[draft.genre] ? 'GENRE DEFAULT' : 'INDEPENDENT AFFILIATION'}</i>
                    </button>
                  ))}
                </div>
              </div>

              <p className="career-note">
                Genre changes the starting attribute spread, career dialogue and move pool. Your element
                sets the elemental lane and status effect of your personal attack, independent of genre.
                This first pick is free; extra elements are unlocked with AP later in the Element Lab.
                Home state and crew change presentation, story details and Feature Verse chemistry.
                The artist model never locks any of these choices.
              </p>
              <button className="btn btn--primary btn--wide" onClick={() => setStep(2)} disabled={!canName}>PREVIEW YOUR CARD →</button>
            </div>
          )}

          {step === 2 && (
            <div className="career-form career-form--studio">
              <p className="kicker">03 · PREVIEW YOUR CARD</p>
              <h1>THE FIRST<br /><em>PRINT</em></h1>
              <div className="career-studio__card">
                <CareerCardPanel career={preview} />
              </div>
              <div className="career-studio__summary">
                <div><span>ARTIST</span><b>{draft.stageName || 'UNNAMED ARTIST'}</b></div>
                <div><span>HOME</span><b>{home.city} · {home.region}</b></div>
                <div><span>PATH</span><b>{draft.genre}</b></div>
                <div><span>ELEMENT</span><b>{element.icon} {element.label}</b></div>
                <div><span>CREW</span><b>{draft.crew}</b></div>
                <div><span>STARTING LEVEL</span><b>1 · 50 OVR</b></div>
                <div><span>STARTING AP</span><b>{CAREER_STARTING_AP}</b></div>
              </div>
              <button className="btn btn--primary btn--wide" onClick={confirm} disabled={!canName}>CONFIRM ARTIST →</button>
            </div>
          )}

          {step === 3 && (
            <div className="career-form career-form--studio career-intro">
              <p className="kicker">04 · CONFIRM AND START</p>
              <h1>THE FIRST<br /><em>NIGHT IS YOURS.</em></h1>
              <div className="career-studio__summary">
                <div><span>ARTIST</span><b>{draft.stageName}</b></div>
                <div><span>MODEL</span><b>{selected.label}</b></div>
                <div><span>HOME STATE</span><b>{home.region}</b></div>
                <div><span>CREW</span><b>{draft.crew}</b></div>
                <div><span>PATH</span><b>{draft.genre}</b></div>
                <div><span>ELEMENT</span><b>{element.icon} {element.label}</b></div>
                <div><span>STARTING LEVEL</span><b>1</b></div>
                <div><span>STARTING OVR</span><b>50</b></div>
                <div><span>STARTING AP</span><b>{CAREER_STARTING_AP}</b></div>
              </div>

              <div className="career-studio__field">
                <span>CAREER DIFFICULTY</span>
                <div className="career-studio__choices">
                  {DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty.id}
                      className={draft.careerDifficulty === difficulty.id ? 'is-on' : ''}
                      onClick={() => chooseDifficulty(difficulty.id)}
                    >
                      <b>{difficulty.label}</b>
                      <i>{difficulty.note}</i>
                    </button>
                  ))}
                </div>
              </div>

              <div className="career-studio__field">
                <span>STARTER DECK</span>
                <div className="career-starter-grid">
                  {CAREER_STARTER_DECKS.map((starter) => (
                    <button
                      key={starter.id}
                      className={draft.starterDeckId === starter.id ? 'is-on' : ''}
                      onClick={() => setDraft(syncCareer({ ...draft, starterDeckId: starter.id }))}
                    >
                      <span>{starter.tagline}</span>
                      <b>{starter.name}</b>
                      <p>{starter.description}</p>
                      <i>25 STANDARD + YOUR ARTIST · 26 TOTAL</i>
                    </button>
                  ))}
                </div>
              </div>

              <div className="career-dialogue">
                <span>MARA VOSS · DUST &amp; GOLD TAPES</span>
                <p>“The tape is done. Now we need a body in the room to prove it. Basement rules: no guest list, no second chances, no wasted bars.”</p>
                <span>YOU · {draft.genre}</span>
                <p>{draft.genre === 'HIP-HOP' ? '“Make the room repeat every bar.”' : draft.genre === 'R&B' ? '“Let the hook do the heavy lifting.”' : '“Turn the stage into a camera flash.”'}</p>
              </div>
              <div className="career-intro__meta">
                <span>CH. 1 · {chapter.title}</span>
                <span>{chapter.label}</span>
                <span>{chapter.venue.name}</span>
              </div>
              <button className="btn btn--primary btn--wide" onClick={launch}>START CAREER →</button>
            </div>
          )}
        </section>
      </div>

      <footer className="career-studio__footer">
        <button className="btn btn--ghost" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>
          ← BACK
        </button>
        <div>
          <button className="btn btn--ghost" onClick={() => setStep(2)} disabled={!canName}>PREVIEW CARD</button>
          <button className="btn btn--ghost" onClick={confirm} disabled={step !== 2 || !canName}>CONFIRM ARTIST</button>
          <button className="btn btn--primary" onClick={launch} disabled={step !== 3}>START CAREER</button>
        </div>
      </footer>

    </main>
  )
}
