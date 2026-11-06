# CAN I KICK IT? — The Game

A premium 26-slot hip-hop, R&B and pop card battler. Build the 26, take the stage, own the room.

**Version 1.2.0 — The Backstage Economy & Social Update**

## Play

- **Live game:** [https://site-feacdc5bc49e490794946b6e6b47f727.freebuff.page/](https://site-feacdc5bc49e490794946b6e6b47f727.freebuff.page/)
- **Windows v1.2.0:** [Download CanIKickIt-win32-x64.zip](https://gofile.io/d/HGV5L1hc) — 165.4 MiB
  - SHA-256: `4d0ff32812ebb3263f99d95b05394124b7c0ad7fb09f6137ca6e0000c9f0bd8e`
- **GitHub:** [https://github.com/SheLuv400/Can-Kick-It-The-Game](https://github.com/SheLuv400/Can-Kick-It-The-Game)

Phone and Windows PC players use the same online network: add each other with a six-character friend code, or share the host's five-character room code. Both devices can meet in the same Casual or Ranked room.

## What’s new in 1.2.0

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

## Audio

The live score, DJ KICKIT announcer clips and sound effects are packaged with the deploy build. The build check confirms **2 music tracks and 36 DJ KICKIT clips** are present.
