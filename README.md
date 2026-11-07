# CAN I KICK IT? — The Game

A premium 26-slot hip-hop, R&B and pop card battler. Build the 26, earn your badges, take the stage, own the room.

**Version 1.3.0 — The Badge & Billboard Update**

## Play

- **Live game:** [https://site-feacdc5bc49e490794946b6e6b47f727.freebuff.page/](https://site-feacdc5bc49e490794946b6e6b47f727.freebuff.page/)
- **Latest release:** [GitHub release v1.3.0](https://github.com/SheLuv400/Can-Kick-It-The-Game/releases/tag/v1.3.0) — artist badges, the friends-only Billboard and THE SETLIST.
- **Windows v1.2.0 (latest packaged Windows build):** [Download CanIKickIt-win32-x64.zip](https://github.com/SheLuv400/Can-Kick-It-The-Game/releases/download/v1.2.0/CanIKickIt-win32-x64.zip) — 165.4 MiB
  - SHA-256: `b8dbe46fcaf65b503f133a45294b490dd7a83d860ec5bae83456622429d7e2f1`
- **GitHub:** [https://github.com/SheLuv400/Can-Kick-It-The-Game](https://github.com/SheLuv400/Can-Kick-It-The-Game)

Phone and Windows PC players use the same online network: add each other with a six-character friend code, or share the host's five-character room code. Both devices can meet in the same Casual or Ranked room.

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
