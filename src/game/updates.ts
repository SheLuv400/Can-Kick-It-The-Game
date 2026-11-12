import { GAME_VERSION } from './version'

export type UpdateSectionKey = 'new' | 'fixed' | 'changed'

export interface UpdateLog {
  version: string
  title: string
  label: string
  summary: string
  sections: Record<UpdateSectionKey, string[]>
}

export const GAME_UPDATES: UpdateLog[] = [
  {
    version: '1.9.0',
    title: 'THE FAIR PLAY UPDATE',
    label: 'CRISIS DESK + ONLINE CONDUCT · NOV 2026',
    summary:
      'The label desk now puts new crises in front of you, career routes accept any qualifying card in the deck, and card placement no longer deals free damage. Online adds a quit cooldown and a report desk with escalating temporary bans.',
    sections: {
      new: [
        'Label Office opens the Crisis Desk automatically when a new crisis is created and keeps a visible case alert on every tab. Resolve the open case and the ADVANCE WEEK gate clears.',
        'Ultimate Team now has thirteen founding missions, including longer win and circuit runs plus 500, 1,500 and 3,000 BUZZ goals.',
        'Career support, feature and elemental objectives now say ANY DECK CARD and count the qualifying stats of every card in your 26. Personal-play and clean objectives stay personal-card routes.',
        'Online VS adds a SAFETY / REPORT desk for bullying, harassment, racial or vocal abuse, cheating and other safety issues. Reports are tied to the player code in the room and stored by the site backend.',
        'Three separate reports in 30 days trigger a 30-minute online ban. Each later report ban doubles: 60 minutes, 120 minutes, then onward.',
        'Three self-initiated online exits inside two hours trigger a 15-minute online cooldown. The gate shows the remaining clock and leaves CPU play, the label and your mixtape available.',
      ],
      fixed: [
        'ADVANCE WEEK no longer leaves an open crisis hidden on another tab. New and existing open crises auto-open the Crisis Desk and show a case alert.',
        'Placing a card from hand to the set no longer deals damage to an artist or the crowd. Damage now comes from moves, Encores and Feature Verses, not repeated cut-and-place churn.',
        'Career missions that asked for healing, shields, elemental cuts or Feature Verses now accept any qualifying card in the deck instead of locking out a personal card without that kit.',
        'Forfeit and quit penalties are recorded only from live online matches. CPU and local shows never write an online quit.',
      ],
      changed: [
        'The battle advisor now marks a card play as a stage move with no entry damage and no attack-target recommendation.',
        'Report bans are global through the public site database. Quit cooldowns stay local to the device so they cannot affect CPU-only play.',
        'The 1.8.0 ASK DJ KICKIT advisor, Graphics & Display controls, 1.7.0 Fatal 4, 1.6.0 Triple Threat, 2v2, chat/voice, festivals and standard 1v1 remain included.',
      ],
    },
  },
  {
    version: '1.8.0',
    title: 'THE STAGE READ UPDATE',
    label: 'ADVISOR + VISUALS · NOV 2026',
    summary:
      'ASK DJ KICKIT brings a two-spin battle advisor to single-player, while Graphics & Display puts the real renderer controls in your hands. Every read is built from legal actions; every visual option is cosmetic and local.',
    sections: {
      new: [
        'ASK DJ KICKIT is a local single-player battle advisor with exactly two spins per match. Ask for a recommendation, grade a legal move before committing, or get a short game plan for the room.',
        'Advice is built from the live board: legal actions, Hype, attack allowance, damage estimates, shields, healing, Crowd pressure, statuses, objectives, Encore and Feature options, knockout chances and the curfew.',
        'Every read highlights the relevant artist and target. Opening or closing the panel is free, and only a completed read spends one gold vinyl charge; the advisor never plays the move for you.',
        'GRAPHICS & DISPLAY adds Auto, Low, Medium, High and Ultra presets with frame limit, render scale, UI scale, card image quality, card materials, holo foil, concert lighting, shadows, bloom, particles and background motion controls.',
        'Audio visualizers, card tilt, reduced motion, flash effects, VHS effects and a live FPS readout can be tuned independently. Auto quality is based on a measured frame sample, not a device-name guess.',
        'The battle HUD and advisor sheet are sized for phones down to 390px without horizontal overflow, with the same controls available on desktop.',
      ],
      fixed: [
        'The single-player advisor HUD and bottom sheet now fit a 390px phone without horizontal overflow.',
        'The update log opens on 1.8.0 for existing profiles instead of showing the previous release first.',
      ],
      changed: [
        'Graphics options are cosmetic and local. They never change damage, HP, Hype, abilities, matchmaking or online results.',
        'ASK DJ KICKIT is exclusive to single-player battles. Online VS and every online festival format keep the advisor hidden and their charges at zero.',
        'The 1.7.0 Fatal 4, Triple Threat, 2v2, chat/voice, career, festival and standard 1v1 content remain included.',
      ],
    },
  },
  {
    version: '1.7.0',
    title: 'THE FATAL FOUR UPDATE',
    label: 'FOUR CORNERS · NOV 2026',
    summary:
      'Fatal 4 brings four players to one private stage. Every corner brings its own deck, crowd and stage, and only one can leave with the crown.',
    sections: {
      new: [
        'FATAL 4 is a four-player casual format in Online VS. The host and three guests each bring a complete 26-card kit, a 72 Crowd meter and their own corner.',
        'Turns rotate host → Guest 1 → Guest 2 → Guest 3. Only the active corner can act, and the active player chooses which rival crowd to attack before the first action.',
        'A corner that reaches zero Crowd is booed off stage. The last living corner wins; if the round-12 curfew arrives first, the highest surviving crowd takes the crown and a tie is a draw.',
        'The in-battle four-corner strip shows every seat, its live crowd, its stage count and who is on the mic, targeting or waiting.',
        'A player who leaves a free-for-all match is marked LEFT and knocked out of that corner; the remaining corners keep playing instead of turning the room into a team forfeit.',
        'The Fatal 4 result screen lists all four final crowds, and RUN IT BACK restores every corner to 72 Crowd.',
        'The four-corner board folds to a 2×2 grid on tablets and phones, then to one column on the smallest screens. Triple Threat now stacks cleanly at 560px and below.',
      ],
      fixed: [
        'Triple Threat and Fatal 4 battle strips no longer overflow a 390px phone.',
        'The free-for-all result screen uses its own four-corner crowd layout instead of the two-player crowd banner.',
        'Fatal 4 curfew and turn logs now name four corners instead of reusing the three-mic copy.',
      ],
      changed: [
        'Fatal 4 is casual-only in this build; ranked play remains 1v1.',
        'The 1.6.0 Triple Threat format, 1.5.0 room text and voice chat, 1.4.9 2v2 tag team and standard 1v1 remain included.',
      ],
    },
  },
  {
    version: '1.6.0',
    title: 'THE TRIPLE THREAT UPDATE',
    label: 'THREE MICS · NOV 2026',
    summary:
      'Private rooms can now put three players on one stage in Triple Threat. Each mic brings its own crowd, deck and stage, and only one can leave with the crown.',
    sections: {
      new: [
        'TRIPLE THREAT is a three-player casual format in Online VS. The host and two guests each bring a complete 26-card kit, a 72 Crowd meter and their own stage.',
        'Turns rotate host → Guest 1 → Guest 2 → host. Only the active mic can act, and the other two seats wait in the three-mic strip until their turn.',
        'The active player chooses one of the other two crowds as the target. The target can be switched until the first action of the turn, then it locks for the rest of that turn.',
        'A crowd that reaches zero is booed off stage. The last living crowd wins; if the round-12 curfew arrives first, the highest remaining crowd takes the crown and a tie is a draw.',
        'The in-battle three-mic strip shows every seat, its live crowd, its stage count and who is on the mic, targeting or waiting.',
      ],
      fixed: [
        'Triple Threat clients only receive the active player\'s hand. Waiting and target hands stay on the host\'s authoritative state.',
        'A guest cannot act or retarget during another seat\'s turn, and a target change after the first action is rejected by the host.',
      ],
      changed: [
        'Triple Threat is casual-only in this build; ranked play remains 1v1.',
        'The 1.5.0 room text chat, opt-in voice chat and the 1.4.9 2v2 format remain included in this build.',
      ],
    },
  },
  {
    version: '1.5.0',
    title: 'THE LIVE LINE UPDATE',
    label: 'ROOM CHAT · NOV 2026',
    summary:
      'Online VS private rooms now carry live text chat and opt-in voice chat from the lobby through the final round. Both controls live in the room and in the battle chat drawer, so every seat can talk without leaving the match.',
    sections: {
      new: [
        'ROOM CHAT opens in every private room and stays available during the battle. Messages are relayed only to the seated players in that room.',
        'VOICE CHAT is an optional peer-to-peer microphone link for every seat, from 1v1 to four-player 2v2. It uses the phone, headset or Bluetooth microphone your device exposes.',
        'TEXT CHAT and VOICE CHAT each have their own on/off control in the lobby and in the battle chat drawer, so a player can listen without typing or mute the mic without leaving the room.',
        'Chat is capped at 180 characters and rate-limited, and messages are stamped with the sender\'s seat and room name by the host.',
      ],
      fixed: [
        'Leaving a room now tears down the microphone stream and every voice link, so the mic is not left live.',
        'Typing a space in chat no longer ends the turn; game keys pause while a chat field has focus.',
      ],
      changed: [
        'Voice is opt-in per player. Joining voice asks for microphone permission and uses echo cancellation, noise suppression and automatic gain control.',
        'The 1.4.9 2v2, House Rules and result-ending changes remain included in this build.',
      ],
    },
  },
  {
    version: '1.4.9',
    title: 'THE 2V2 HOUSE RULES UPDATE',
    label: 'TAG TEAM · NOV 2026',
    summary:
      'Online private rooms now seat four players for 2v2 tag-team battles, with one shared Crowd meter per team and DJ\'s House Rules deciding the format and modifiers. Standard 1v1 is unchanged.',
    sections: {
      new: [
        'TAG TEAM HEADLINERS seats the host and Guest 1 on Team A against Guest 2 and Guest 3 on Team B. Turns alternate A1 → B1 → A2 → B2, and only the active seat can act.',
        'Each seat keeps its own 26-card deck, hand, Hype, stage, Crate, Backstage and Encore. Teammates do not share a hand, and the opposing team never sees it.',
        'Each team shares one 144 Crowd meter, double the 1v1 72. 2v2 Crowd damage is multiplied by 1.5, so a team can be Crowded out before the round-12 curfew.',
        'DJ\'s House Rules adds Standard, Custom and Shuffle presets and up to three compatible modifiers, with a ready gate before the first turn.',
        'The private-room lobby now shows an artist wall, rejects a fifth player and lets an empty seat be reclaimed after a rejoin.',
        'The result screen separates a Crowd-out, a curfew decision and a forfeit; a rematch restores both 144 Crowd meters.',
      ],
      fixed: [
        '2v2 rooms keep each player\'s own hand and kit instead of sharing one team hand.',
        'A counter window can be answered by the defending team, and END TURN is blocked while a counter is pending.',
        'Leaving a 2v2 match now broadcasts the forfeit to every remaining client.',
      ],
      changed: [
        '2v2 is casual-only in this build; ranked play remains 1v1.',
        'Standard 1v1 keeps the 72 Crowd meter, the original turn flow and no tag-team party.',
        'The 1.4.8 local AP and badge-equip changes remain included in this build.',
      ],
    },
  },
  {
    version: '1.4.8',
    title: 'THE LOCAL AP UPDATE',
    label: 'CAREER ECONOMY · NOV 2026',
    summary:
      'Local CPU wins now pay AP, giving career players a repeatable way to finish their OVR and element unlocks. The AP ceiling rises to 315 so the full career build fits without wasting rewards.',
    sections: {
      new: [
        'Local CPU wins now award 1 AP each, up to 5 AP per career save per day. Losses and draws pay no AP.',
        'The Career Hub local CPU button and the post-show results screen now show the AP reward, and the development and settings notes explain the daily cap.',
        'The AP ceiling is now 315: 245 AP for the full 50–99 OVR climb plus 70 AP for all seven non-starter element unlocks.',
      ],
      fixed: [
        'A career that had earned 245 AP could not afford both max OVR and every element; local wins now supply the remaining AP.',
        'Local AP has its own daily counter and is not reduced by the 160 XP local-show cap.',
      ],
      changed: [
        'First clears still pay 5 AP and chapter bosses still pay 10 AP. Local CPU wins are the repeatable source.',
        'The 1.4.7 badge equip fix remains included in this build.',
      ],
    },
  },
  {
    version: '1.4.7',
    title: 'THE BADGE EQUIP UPDATE',
    label: 'CAREER BADGES · NOV 2026',
    summary:
      'Career badges now equip the moment you tap them. The badge menu shows an explicit equip state, a live slot count and a clear reason whenever a slot is locked or full, so unlocked badges never look like they are doing nothing.',
    sections: {
      new: [
        'Career BADGES now saves the moment you tap an unlocked badge; the old SAVE BADGES step is gone.',
        'Every badge card shows TAP TO EQUIP or EQUIPPED · TAP TO REMOVE, and the menu shows how many slots are in use.',
        'The Collection badge menu is now labelled EQUIP BADGES and uses the same tap-to-equip instructions and confirmation notices.',
      ],
      fixed: [
        'Tapping an unlocked career badge used to change only a local draft, so it looked like nothing happened unless you found SAVE BADGES at the bottom of the page.',
        'A badge tap with no open slot or a full set no longer fails silently; the menu explains the requirement instead.',
      ],
      changed: [
        'REMOVE ALL and DONE · BACK TO HUB replace the old save footer. Equip changes are written to the active career save immediately.',
        'The career badge guide calls out that the first slot opens at level 10, then at levels 20, 30, 40 and 55.',
      ],
    },
  },
  {
    version: '1.4.6',
    title: 'THE MULTI-CAREER UPDATE',
    label: 'SAVE SLOTS · XP PACING · NOV 2026',
    summary:
      'My Artist Career now keeps five independent local artists, with create, switch and delete controls that leave a deleted slot ready for a fresh career. Leveling is about 15% slower, and existing careers keep their current level and progress.',
    sections: {
      new: [
        'Five career save slots now live in one browser. Each slot keeps its own artist, level, OVR, story progress, badges, elements, deck and settings.',
        'The old single career save moves into slot 1 automatically. Slots 2–5 start empty and ready for new artists.',
        'The career landing page and SAVE / SETTINGS now show a slot manager with CREATE HERE, SWITCH and DELETE controls. Deleting a slot asks for confirmation and leaves it fresh for a new career.',
        'New careers open in the next empty slot. CONTINUE SAVED CAREER returns to the first saved slot, and every slot stays visible even when the active one is empty.',
      ],
      fixed: [
        'Deleting a career now clears only the chosen slot instead of the whole career record.',
        'Switching slots saves the current career first and re-registers the personal card for battles.',
      ],
      changed: [
        'Career leveling is about 15% slower. Level 1 now needs 6,210 XP instead of 5,400, and the longer curve continues through the Prestige and Master ladders.',
        'Mission XP rewards are unchanged. Existing careers are mapped onto the longer curve with the same level and the same percentage of progress through that level.',
        'The career save schema is now version 7; legacy single-save data migrates into slot 1 on first load.',
      ],
    },
  },
  {
    version: '1.4.5',
    title: 'THE PRESTIGE TEN UPDATE',
    label: 'CARD PROGRESSION · NOV 2026',
    summary:
      'My Artist Career now runs ten Prestiges of levels 1–55 before Prestige Master levels 56–1,000. OVR and AP persist through every reset, each Prestige grants a token that permanently keeps one move and one badge, and the full climb to Prestige Legend takes about 11.5 million XP.',
    sections: {
      new: [
        'Career cards now climb from level 1 to 55 per Prestige. Ten full Prestiges reach Prestige Legend, then the next level begins the Master ladder at level 56 through 1,000.',
        'Career cards now have 105 permanent card titles: 50 across the ten Prestige climbs, 5 at Master entry, and 5 at every 100 Master levels through 1,000. Unlocked titles can be equipped on the career card and selected for the online player card.',
        'Career creation now includes an eight-element attack choice. The first element is free; additional elements cost AP, persist through Prestige, and can be swapped freely once unlocked. A second equipped element opens at 90 OVR.',
        'Every career preset starts at level 1 and 50 OVR. OVR remains a separate 50–99 score; AP comes from first clears and chapter bosses, never from level-ups, and both OVR and AP persist through Prestige.',
        'Solo Festival CPU decks now match the highest card level in your five-card starting lineup, from the opening acts to late replacements.',
        'Collection and Setlist keep their standard 400 cap; Career uses its own Prestige-run levels, separate 50–99 OVR and a Legacy title/color layer.',
        'My Artist Career now uses the same ten shared badge programs and five tiers as every other mode. Story clears unlock a Plastic copy, and career battles add tier XP. Prestige relocks non-permanent badges and returns permanent badges to Plastic.',
      ],
      fixed: [
        'Removed the old level-10 clamp from card levels, card XP and saved progress; existing cards keep their levels and can keep climbing.',
        'Card XP now stops at each mode’s ceiling instead of accumulating past max; Career caps a run at 55 until Prestige.',
        'The phone main menu uses a clean two-column mode grid, keeping all eight cards readable without horizontal clipping.',
        'The Career development meter now reads the current Prestige level, with OVR and AP shown separately.',
        'The six career-only badges are gone. Existing career saves migrate their unlocked badges and equipped set to the shared catalog.',
      ],
      changed: [
        'Normal CPU cards remain at OPENING, HEADLINER and LEGEND levels 1, 2 and 3; only solo Festival events match the player\'s card level.',
        'Career card power follows OVR and AP investment; level-ups only advance the Prestige run and never award AP.',
        'Prestige resets the level and relocks every non-permanent move and badge. Each reset grants one token that permanently preserves one move and one badge; permanent badges still have to re-earn their tier. OVR, AP, attributes, campaign progress and Legacy rewards stay. Ten full resets reach Prestige Legend; the next level begins Prestige Master. Card titles survive every reset and can be used as online player-card titles.',
      ],
    },
  },
  {
    version: '1.4.4',
    title: 'THE STUDIO PORTRAIT UPDATE',
    label: 'CAREER PORTRAIT · NOV 2026',
    summary:
      'The personal Artist Card now renders a larger, studio-lit portrait that follows the selected face, hair, hat, jewelry, glasses and top.',
    sections: {
      new: [
        'Twelve rebuilt faces with individual proportions, skin shading, eyes, brows, noses and lips.',
        'A head-and-shoulders card portrait with layered hair, hats, glasses, jewelry and gendered tops.',
        'The career creator, hub and Artist Card now share the same portrait framing.',
      ],
      fixed: [
        'The card portrait no longer uses the flat sketch renderer or fixed gradient IDs, so several portraits can render without colour collisions.',
        'The Artist Card stacks its portrait above the details on phones instead of squeezing both into two narrow columns.',
      ],
      changed: [
        'The creator preview is now a portrait bust, and the card reads as a headshot at 360px and 390px.',
      ],
    },
  },
  {
    version: '1.4.3',
    title: 'THE SIGNATURE PRESET UPDATE',
    label: 'CREATE-A-ARTIST · NOV 2026',
    summary:
      'The creator now uses the approved signature preset set, with gendered faces and fits and twelve shoe models from the new shoe sheets.',
    sections: {
      new: [
        'Two presentations, each with six faces, six hairstyles and six signature tops.',
        'Six skin tones, six jewelry options and six hats, including fitted caps, beanies, visors, bucket hats, headbands and bandanas.',
        'Twelve replacement shoe presets drawn from the approved shoe sheets, from white high-tops to wheat work boots and chunky silver runners.',
        'The layered artist portrait now renders the selected face, hair, top, jewelry, hat and shoe model everywhere the personal card appears.',
      ],
      fixed: [
        'Switching presentation keeps only compatible faces, hairstyles and tops selected.',
        'Older careers migrate their previous appearance IDs to the closest new preset without changing their artist ID, XP, AP, OVR, missions, moves or badges.',
      ],
      changed: [
        'The creator is now titled SIGNATURE PRESET STUDIO and ships in the browser, mobile/PWA and Windows builds.',
      ],
    },
  },
  {
    version: '1.4.2',
    title: 'THE USERNAME HANDOFF',
    label: 'ONLINE FIX · NOV 2026',
    summary:
      'Friends now keep their usernames in the friends list, on the Billboard and in online battle after you meet in a room.',
    sections: {
      new: [
        'The Windows main menu now includes a direct EXIT GAME control with the same save-safe confirmation as Settings.',
      ],
      fixed: [
        'A private-room opponent profile now saves that username to your friend record, so the friends list and Billboard stop showing the six-character friend-code placeholder after you play together.',
        'Online battles show VS <username> in the room badge and player HUD, while the rival stage and result screen keep using the same username.',
        'Friend names still update live when both players are online, and the saved name survives a reload.',
      ],
      changed: [
        'If a username has never been shared, the friend still shows as FRIEND <code> until your next presence sync or shared room.',
      ],
    },
  },
  {
    version: '1.4.1',
    title: 'THE SOCIAL LINE HOTFIX',
    label: 'ONLINE HOTFIX · NOV 2026',
    summary:
      'Friend presence now stays live on Windows and mobile when both players open the game at the same time.',
    sections: {
      new: [],
      fixed: [
        'Both players can keep simultaneous direct links without one side closing the other side\'s link, so friends no longer show OFFLINE while both clients are online.',
        'Presence is sent once per live link instead of registering a second incoming-open handler.',
      ],
      changed: [],
    },
  },
  {
    version: '1.4.0',
    title: 'THE FESTIVAL & TOUR CIRCUIT UPDATE',
    label: 'FESTIVAL SEASON · NOV 2026',
    summary:
      'Six original festivals, three five-stop solo tours and invite-only online festival rooms now share one Circuit Point track and a Gold, Platinum and Diamond reward season.',
    sections: {
      new: [
        'THE FESTIVAL & TOUR CIRCUIT joins the main menu with a full 2003 festival calendar, original posters, venue marquees and animated 72-hour countdowns.',
        'Three solo festivals — Blacktop Frequency Fest, Velvet Afterdark Sessions and Crate City Comeback Jam — each run five CPU stops with unique dialogue, legal 26-card rival decks and a stronger Headliner finale.',
        'Three online festivals — Subwoofer Showdown, Chrome & Chorus Expo and Diamond Mic Finals — use the existing private host/join room codes, lock the official rules and verify both 26-card setlists before launch.',
        'A shared Circuit Points track pays solo first clears, repeat clears, Headliner wins and challenge objectives; online adds verified wins, completed losses, first-Feature bonuses, streak bonuses and Streak Setter bounties.',
        'Setlist Synergy reads the real roster tags and shows live progress toward each event requirement. Meeting it activates the configured XP multiplier without changing deck size or Circuit Points.',
        'Gold, Platinum and Diamond rewards add a microphone border, card sleeves, festival banner, alternate-art card, animated badge and Headliner title to the Collection.',
        'Six engine-level festival modifiers cover first Hip-Hop attacks, healing, Backstage revivals, bass attacks, Feature Verses and mixed-genre attack chains.',
      ],
      fixed: [
        'Festival previews never grant official Circuit Points outside a live event window.',
        'Online festival rematches against the same opponent are rate-limited per day and cannot farm the same result.',
        'Losing a rated festival match correctly clears the temporary Streak Setter status.',
      ],
      changed: [
        'The main menu now has seven doors with the festival spanning its own double-width stage tile.',
        'Normal Play, the three existing circuits and non-event private rooms keep their original rules and deck-size validation.',
      ],
    },
  },
  {
    version: '1.3.0',
    title: 'THE BADGE & BILLBOARD UPDATE',
    label: 'HEADLINE SEASON · NOV 2026',
    summary:
      'Every artist gets a ten-program badge chase, friends can now run the Billboard together, and the Artist Loadout becomes a proper record-sleeve setlist.',
    sections: {
      new: [
        'Artist badges: ten programs per artist, five equip slots and effects that change the set.',
        'Five badge tiers — Plastic, Bronze, Gold, Platinum and Diamond — each with its own XP pool, glow and battle power.',
        'The Badge Lab tracks every program, its next threshold and the set power you are bringing to the stage.',
        'A friends-only Billboard ranks your whole grind: wins, KOs, streaks, badge tiers, artist levels, label score and chart heat.',
        'THE SETLIST redesigns the Artist Loadout as a screen-printed mixtape sleeve with track slots, crate cuts and a legible sticky header.',
      ],
      fixed: [
        'The Artist Loadout no longer inherits theme ink, so its cream paper, labels and track names stay readable on every theme and phone.',
        'At 360px the element stat stays whole and the loadout footer actions stay inside the panel.',
      ],
      changed: [
        'Badge progress and equipped badges are saved with each artist, and new tier unlocks get their own toast.',
        'Casual online still strips custom badge loadouts; Ranked and solo keep the full badge effects.',
      ],
    },
  },
  {
    version: '1.2.0',
    title: 'THE BACKSTAGE ECONOMY & SOCIAL UPDATE',
    label: 'BACKSTAGE SEASON · NOV 2026',
    summary:
      'Hype becomes the engine of the show, online play gets Casual and Ranked rooms, and the CIKI profile becomes a real backstage pass.',
    sections: {
      new: [
        'Hype economy reworked: open with 8 Hype, gain 3 per turn and bank up to 24.',
        'Attacks are free. Each artist moves once, each player gets 3 attacks per turn, and big hits close the turn.',
        'Casual and Ranked online rooms with saved profiles, friend codes, live presence and direct invites.',
        'Player cards track records, favorite cuts, attack rate, response tempo, damage, KOs, Encores and room splits.',
        'Profile artists: choose any of the 50 in-game artists as your portrait for the CIKI ID, player cards, online friends and label profile.',
        'Battle MVP: the results screen crowns your standout card with match impact plus the top action, damage, healing and defense leaders.',
        'The Label Office can drop an artist to free a roster slot for a new signing.',
        'The in-game Update Log now keeps a browsable archive of every release from this point forward.',
      ],
      fixed: [
        'Crate draws no longer end the turn.',
        'Round 12 now correctly resolves to a draw when both crowds finish level.',
        'Attack Hype costs, attack caps and Feature Verse turn rules now resolve consistently.',
        'CIKI ID and player-card panels no longer inherit the light theme background.',
        'Compact main-menu layouts keep the account control and quick links accessible.',
      ],
      changed: [
        'Backstage recalls now cost 10–15 Hype based on artist strength and level, and can be repeated.',
        'Crate draws cost 2 Hype; support moves still spend Hype as shown on their cards.',
        'The tutorial and rulebook now explain the new economy, attack limit and online modes.',
      ],
    },
  },
  {
    version: '1.1.0',
    title: 'THE CIRCUIT UPDATE',
    label: 'CIRCUIT SEASON · 2026',
    summary:
      'The show leaves one room and takes over the city, with three circuits, rotating venues and live objective lists.',
    sections: {
      new: [
        'Three circuits: The Music Circuit, The Underground Circuit and rotating Headliner gigs.',
        'Eight venues, each with its own room, stage size, rule modifiers and objective list.',
        'In-match objectives that pay bonus record credits and Buzz Rep when cleared.',
        '100 named Headliner reward variants built from house and crowd bonuses.',
      ],
      fixed: [
        'Headliner offers now refresh with their venue, slot count, objectives and purse.',
        'Circuit objective progress now stays in sync with the live battle state.',
      ],
      changed: [
        'Normal Play now rotates through the full venue list instead of always opening at The Midnight Garden.',
        'Circuit purses and stage slots now scale with the risk of the gig.',
      ],
    },
  },
  {
    version: '1.0.0',
    title: 'THE FIRST NIGHT',
    label: 'LAUNCH BUILD · 2026',
    summary:
      'The original 26-slot card battler opens its doors at The Midnight Garden.',
    sections: {
      new: [
        'Initial release with 50 artists, 26-card mixtapes and three-move artist loadouts.',
        'Headliner battles with Crate specials, Backstage recalls, Clapbacks and Encore transformations.',
        'Record Label HQ, weekly charts, collection, tutorial, original score and DJ KICKIT announcer.',
      ],
      fixed: [],
      changed: [],
    },
  },
]

const SEEN_KEY = 'ciki.updates.seen.v1'

export function updateNoteCount(log: UpdateLog): number {
  return Object.values(log.sections).reduce((total, items) => total + items.length, 0)
}

export function loadSeenUpdateVersion(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function markUpdateSeen(version: string = GAME_VERSION) {
  try {
    localStorage.setItem(SEEN_KEY, version)
  } catch {
    // A blocked storage write should never stop the log from opening.
  }
}
