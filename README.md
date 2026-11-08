# CAN I KICK IT? — The Game

A premium 26-slot hip-hop, R&B and pop card battler. Build the 26, earn your badges, take the stage, own the room.

**Version 1.4.6 — The Multi-Career Update**

## Play

- **Live game:** [https://site-feacdc5bc49e490794946b6e6b47f727.freebuff.page/](https://site-feacdc5bc49e490794946b6e6b47f727.freebuff.page/)
- **Live mobile/PWA:** 1.4.6 is deployed at the game URL above, with manifest version 1.4.6. Both public site URLs serve the 1.4.6 payload.
- **Latest public release:** [GitHub release v1.4.1](https://github.com/SheLuv400/Can-Kick-It-The-Game/releases/tag/v1.4.1) — THE SOCIAL LINE HOTFIX, with the Windows build. The 1.4.6 mobile/PWA build is live. The 1.4.4 and 1.4.5 Windows archives are built and verified locally; neither is attached to a public release yet.
- **Windows launcher (recommended):** [Download CanIKickItLauncher-1.0.1-win32-x64.zip](https://github.com/SheLuv400/Can-Kick-It-The-Game/releases/download/v1.4.1/CanIKickItLauncher-1.0.1-win32-x64.zip) — 152.0 MiB
  - Extract and run `CanIKickItLauncher.exe`. It installs the game, checks GitHub Releases for updates, and launches it from one place.
  - SHA-256: `066d7a2c8357c229a631dda1a263951c476e09e3279d83b10a224206bd17201b`
- **Windows game build (manual):** [Download CanIKickIt-1.4.1-win32-x64.zip](https://github.com/SheLuv400/Can-Kick-It-The-Game/releases/download/v1.4.1/CanIKickIt-1.4.1-win32-x64.zip) — 164.8 MiB
  - SHA-256: `9afebc2598f2d242d19a5439e9691c3c5c6451de7f331cef46632cd0049aebad`
  - The 1.4.5 Windows archive is built and verified locally from the same web bundle. It is not attached to a public release yet, so this manual link remains 1.4.1.
- **GitHub:** [https://github.com/SheLuv400/Can-Kick-It-The-Game](https://github.com/SheLuv400/Can-Kick-It-The-Game)

Phone and Windows PC players use the same online network: add each other with a six-character friend code, or share the host's five-character room code. Both devices can meet in the same Casual or Ranked room.

## Windows launcher

The launcher is the recommended Windows install. Download it once, extract the ZIP, and run `CanIKickItLauncher.exe`.

- **Updates:** the launcher checks GitHub Releases when it opens and every 15 minutes. It downloads the latest Windows game build, verifies the SHA-256 digest when GitHub provides one, extracts to a staging folder, swaps it into place, and launches `CanIKickIt.exe`.
- **Game location:** `%LOCALAPPDATA%\CanIKickItLauncher\Game` by default. Use **Settings → Choose Folder** to install somewhere else.
- **Saves:** existing game save data is untouched by launcher updates.
- **Offline:** if GitHub cannot be reached, an installed build can still be launched; the update controls show a retry message.
- **Blocked updates:** if Windows says the game folder is blocked, fully quit `CanIKickIt.exe` in Task Manager, then retry. Launcher 1.0.1 checks for a running game before updating and retries transient folder locks; if the folder is still protected, choose a folder such as `C:\Games\CanIKickItTheGame` in **Settings → Choose Folder**.
- **Launcher updates:** the launcher itself is version 1.0.1 and is updated separately. Game updates are handled inside it.
- **Unsigned build:** Windows SmartScreen may warn on first launch. Choose **More info → Run anyway** if you trust the download.

## What’s new in 1.4.6

### THE MULTI-CAREER UPDATE

- **Five career save slots.** My Artist Career now keeps five independent local artists in one browser, each with its own level, OVR, story progress, badges, elements, deck and settings.
- **Create, switch and delete.** An empty slot can start a new artist, a saved slot can be loaded at any time, and deleting a slot clears only that artist so the slot is ready for a fresh career. The old single save migrates into slot 1 automatically.
- **Slower career leveling.** Level 1 now needs 6,210 XP instead of 5,400, and the longer curve continues through the Prestige and Master ladders. Mission rewards are unchanged, and existing careers keep their current level and progress.
- **Release status.** The 1.4.6 payload is live at the game URL above.

## What’s new in 1.4.5

### THE 400 CLUB UPDATE

- **Every card can reach level 400.** The old level-10 ceiling is gone; cards now use 100 XP per level and need 39,900 XP to finish.
- **Career cards climb too.** Levels 1–50 keep the original curve, then levels 51–400 cost 500 XP each and continue raising personal card power.
- **Festival events match your level.** Solo Festival CPU decks use the highest card level in your five-card starting lineup. Normal CPU cards stay at their difficulty levels.
- **Career badges are the shared badges.** My Artist Career now uses the same ten programs and five tiers as every other mode. Story clears unlock a Plastic copy, career battles add tier XP, and old career badges migrate automatically.
- **The phone menu is fixed.** All eight main-menu modes now sit in a clean two-column grid without clipped labels or horizontal overflow.
- **Mobile/PWA:** 1.4.6 is live at the game URL above with manifest version 1.4.6.
- **Windows:** `release/CanIKickIt-1.4.5-win32-x64.zip` is built and verified from the same 1.4.5 web bundle. Size: 174,650,732 bytes (166.6 MiB). SHA-256: `c4d1725712df6e41320c2512867cd48b2a69d7bef185a41d5056692856d4f9fd`.

## What’s new in 1.4.4

### THE BUILT-IN MODEL UPDATE

- **A built-in 12-model roster.** My Artist Career now uses the twelve supplied full-body models: six male and six female. Every model is bundled with the game and ready in the creator.
- **The roster is locked.** The faces, fits and silhouettes are fixed. There is no face, hair, outfit or model replacement in the career creator; every model starts at 50 OVR with the same move pool and badge eligibility.
- **Card-ready crops.** Each full-body model has a dedicated 320×480 card portrait, so the creator, artist card and career hub show the same artist at every size.
- **Mobile card layout.** Below 720px the Artist Card stacks the portrait above the name and stats instead of squeezing both into 112px + text columns. Checked at 390×844 and 360×800.
- **Scope note.** The roster is the supplied artwork; the game bundles optimized WebP derivatives rather than redrawing or substituting the characters. Existing careers keep their IDs, XP, AP, OVR, missions, moves, badges and decks; the fixed model now supplies their artwork.
- **Mobile/PWA:** 1.4.4 shipped with manifest version 1.4.4; it has since been replaced by 1.4.5.
- **Windows:** `release/CanIKickIt-1.4.4-win32-x64.zip` is built and verified locally with the same 1.4.4 web bundle, including all 24 full-body and card assets. Size: 173,939,402 bytes (166 MiB). SHA-256: `0026712b17d7a6f82b53c8b3b1d56d19b4f7fe6961d06d259afc20f882d73433`.

## What’s new in 1.4.3

### THE SIGNATURE PRESET UPDATE

- **A proper signature creator.** The creator now has two presentations, each with six faces, six hairstyles and six gendered tops.
- **The full preset wardrobe.** Six skin tones, six jewelry options and six hats cover chains, pendants, medallions, hoops, studs, fitted caps, beanies, visors, bucket hats, headbands and bandanas.
- **Twelve shoe models replace the original shoe row.** The approved shoe sheets now supply white and red high-tops, wheat work boots, black/silver runners, purple lows, canvas lows and the chunky silver/gold pair.
- **The portrait follows the whole fit.** Face, hair, top, jewelry, hat and shoe selections are rendered on the personal Artist Card, career hub, creator preview and battle stage.
- **Old careers migrate safely.** Previous appearance IDs map to the closest new preset without changing artist ID, XP, AP, OVR, missions, moves, badges or deck.
- **Mobile/PWA:** the 1.4.3 payload is built in `dist` and `site-optimized`, with manifest version 1.4.3. The creator was checked at 390×844 and 360×800 with all 12 shoes and no horizontal overflow.
- **Windows:** `release/CanIKickIt-1.4.3-win32-x64.zip` has been rebuilt with the same web bundle. Size: 172,819,134 bytes (164.8 MiB). SHA-256: `029fb0a7b605a99ec5b18f3246ab5b8c99ba4d47cb291189296f4fca108d4dc0`. The ZIP and embedded `app.asar` passed integrity checks.

## What’s new in 1.4.2

### THE USERNAME HANDOFF

- **Names follow the room.** When a private-room handshake exposes an opponent profile, the matching friend record now saves the opponent’s username instead of leaving `FRIEND <code>` behind.
- **The Billboard and friends list use it.** The saved name becomes the primary player name on the friends-only Billboard and in the friends list, and it survives a reload.
- **Online battle shows it.** The visible rival heading now shows the opponent’s username on phone and desktop, and the desktop room badge shows `VS <username> · ROOM <code>`.
- **Windows main menu exit.** The Windows build adds a direct **EXIT GAME** control in the main menu, with the existing save-safe confirmation.
- **Presence still refreshes names.** If both players are online, the live presence sync continues to update the friend’s name.
- **Existing friend records.** A record that has only ever seen a friend while offline keeps its code fallback until the two of you next share a room or are online together. Rejoining a room after updating fills it in.
- **Windows and browser share the fix.** The 1.4.2 browser build is live. The matching Windows archive is built and verified with the same bundle.

## What’s new in 1.4.1

### THE SOCIAL LINE HOTFIX

- **Presence stays online.** Two friends opening the game at the same moment can no longer knock each other offline. Each live connection is tracked independently, and a player only appears offline after their last connection closes.
- **Windows and mobile share the fix.** The browser build and the 1.4.1 Windows archive both include it. Existing launcher installs will detect 1.4.1 automatically.

## What’s new in 1.4.0

### THE FESTIVAL & TOUR CIRCUIT

- **One new mode, two routes.** The main menu adds **THE FESTIVAL & TOUR CIRCUIT**, with a solo tour road and invite-only online festival rooms feeding one shared Circuit Point track.
- **Six original festivals.** Blacktop Frequency Fest, Velvet Afterdark Sessions and Crate City Comeback Jam are solo tours; Subwoofer Showdown, Chrome & Chorus Expo and Diamond Mic Finals are private online festivals.
- **Living calendar.** Three 72-hour weekend pairings show **LIVE NOW**, **COMING SOON**, **EVENT ENDED**, live countdowns, deck tags, official rules and reward previews. Each solo festival has five CPU stops, rising difficulty, unique dialogue and a Headliner finale.
- **26 cards, no exceptions.** Setlist Synergy reads the actual artist roster, displays progress against the real requirement and never asks for an impossible tag. The existing 26-card deck limit, two-copy rule, five crews, three eras and 50 Encore transformations are unchanged.
- **Shared rewards.** Solo clears, repeats, Headliner wins and challenge objectives pay Circuit Points; online wins, completed losses, first Feature Verses, streaks and Streak Setter bounties add competitive recognition. Gold (300), Platinum (800) and Diamond (1,600) rewards persist in the Collection.
- **Six engine-level rules.** First Hip-Hop attack damage, extra healing, first Backstage revival Hype, bass attack damage and extra Hype cost, Feature Verse damage and mixed-genre attack chains all resolve in the shared battle engine for both players.
- **Private rooms stay private.** Festival rooms reuse the existing five-character host/join codes and friend invites. The host owns the authoritative match state; both decks and the same event configuration are checked before the show starts. No public matchmaking was added.

## What’s new in 1.3.0

### Artist badges

- Every artist now has **ten badge programs** and **five equip slots**. Badges start locked and build only when you repeat the action they reward: wins, KOs, defense, healing, elemental moves, crowd pressure, Hype, Encores, assists and longevity.
- Five visible tiers — **Plastic → Bronze → Gold → Platinum → Diamond** — each with its own XP pool, color, glow and a stronger in-battle effect.
- The **Badge Lab** shows every program’s next threshold, your set power and the exact bonus a badge is bringing to the stage.
- Tier unlocks fire a notification, and the badge card lights up in its metal color.
- Badge effects run in solo and Ranked; Casual online strips custom badge loadouts to keep the room fair.

### Friends-only Billboard

- The Billboard now ranks **you against your friends**, not the whole internet.
- Every score is built from battle work, badge tiers and XP, artist levels, label score and chart heat — so a strong roster or a hot record can move you up the board.
- Friends sync live, so active players can pass each other without reloading the page.
- The **Room Record** tab stays alongside it for room-code wins, streaks and match history.

### THE SETLIST

- The Artist Loadout is now **THE SETLIST**, a screen-printed mixtape sleeve with warm paper, halftone grain, hard ink borders, crate numbering and SIDE A/SIDE B stamps.
- The track slots, move crate, signature special and footer all use a fixed high-contrast palette instead of inherited theme ink, so titles and move names stay readable on every theme and phone.
- The mobile layout keeps the sticky header opaque, reflows the element stat at 360px and keeps the save controls inside the panel.
- Equipping still works the same way: **three tracks**, tap an equipped move to remove it, swap from the crate and save.

## What was new in 1.2.0

### Better Hype economy

- Open with **8 Hype**, gain **+3 per turn**, and bank up to **24**.
- **Attacks are free.** Each artist can move once and each player gets **3 attacks per turn**.
- Any attack with **7+ power** or **8+ resolved damage** closes the turn.
- A **Feature Verse** consumes the whole attack allowance for that round.
- Cutting an artist refunds **1 Hype** at cost 1–4, **2** at 5, **3** at 8, scaling upward.
- Knockouts, strong signings and high-rarity Crate attacks generate extra Hype.
- **Backstage recalls cost 10–15 Hype** based on card strength and level, and are no longer once per match.
- **Crate draws cost 2 Hype** and no longer end the turn.
- Round 12 now awards a **draw** when both crowds finish level.

### Online, accounts and friends

- Saved local **username/password login** with hashed credentials, remembered session and sign-out.
- **Casual** online strips custom levels and loadouts to level 1 defaults; **Ranked** keeps the full collection and records the leaderboard.
- Add friends by **six-character friend code**, see **online / playing / offline** presence, and send in-game invites with accept and join.
- **Cross-play** — phone and PC join the same rooms with friend codes, five-character room codes or direct invites.
- Your username appears on stage and in the online lobby.

### Battle MVP

- The results screen names the **MVP card of the match**, scored from damage, healing, damage prevented, actions and KOs.
- Separate leader cells call out **Most Used**, **Top Damage**, **Top Healing** and **Top Defense**, with the chosen profile artist on the winning card.

### Label roster moves

- **Drop an artist** from the label to free a slot and sign someone else. All remaining benefits and unreleased plans for that artist are lost; record credits are not refunded.

## What was new in 1.1.0

### Three real circuits

- **The Music Circuit** — wider stage-building sets. The Radio Edit rule adds Hype every turn and lets Encores restore Crowd. Clear stage, crew and Feature Verse objectives.
- **The Underground Circuit** — short 3–4 slot sets with **no Clapbacks**. Both sides deal extra crowd damage and Features give extra Hype. The list rewards combos, Crate draws and KOs.
- **The Headliner Circuit** — a rotating board of three gigs: safe money, house money and all-in. Each offer has its own room, risk tier, slot count, objective list and randomized purse.

### Fresh rooms and rewards

- Eight venues across the city, including The Basement, Rooftop Radio, The Chrome Chapel, Pier 26, The Velvet Ballroom, Neon Arcade and Crown Coliseum.
- Headliner rewards are drawn from **100 named variants** built from house and crowd bonuses.
- Normal Play now rotates through the full venue list instead of always opening at The Midnight Garden.

### In-match objectives

Circuit lists are visible before the show and tracked live in battle. Cleared objectives pay bonus RC and Buzz Rep. Win the gig to bank the full purse.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Controls

- Click an artist card to open their three equipped moves.
- `N` cycles to the next performer who is ready.
- `Escape` closes the move panel.
- `Space` ends the turn only when no modal or move panel is open.
- The pre-show intro lists the venue, live slot count, circuit rule and tonight’s objectives.

### Controller

Connect a standard-mapping Xbox, PlayStation or PC controller and press any button. A focus ring and an on-screen button guide appear, and the game keeps focus inside the active modal or overlay.

- **Menus:** D-pad or left stick moves, **A/Cross** selects, **B/Circle** goes back, **Start/Menu** opens settings.
- **Battle:** **A/Cross** selects artists and moves, **B/Circle** backs out, **X/Square** ends the turn, **Y/Triangle** selects the next ready artist, **LB/RB** cycles the attack target, and **Start/Menu** pauses.
- The same controls work in the browser game and the Windows build wherever the browser exposes the Gamepad API.

## Audio

The live score, DJ KICKIT announcer clips and sound effects are packaged with the deploy build. The build check confirms **2 music tracks and 36 DJ KICKIT clips** are present.
