# Xbox Edge hardware test checklist

**Status: NOT HARDWARE TESTED.**

No Xbox Series S, Xbox Series X, or Xbox Edge console session was available for
this change. All results in this repository were produced with headless
Chromium on desktop. The automated controller tests use the browser's standard
Gamepad API through a virtual Xbox-mapped pad, not a physical controller. Do not
describe the Xbox compatibility work as hardware-verified until this checklist
has been completed on both consoles.

## What is already verified

Run date: 2026-11-09.

| Area | Environment | Result |
| --- | --- | --- |
| Xbox Edge UI audit | Chromium 1920×1080, virtual Xbox pad | 87/87 checks |
| Main menu, Collection, Mixtape, Ultimate Team, Career | 100% TV scale | Rendered, controller focus enters each screen, Back returns |
| Settings | 100/125/150% TV scale | Panel fits viewport, scrolls, close button stays reachable |
| Battle | 100% TV scale | Full board, hand and END TURN fit inside 1080p |
| Battle | 125/150% TV scale | No horizontal overflow; vertical scroll reaches END TURN and key actions |
| Controller battle path | Virtual Xbox pad | A, B, X, Y, LB/RB, LT/RT and Start exercised |
| Audio entry | Chromium, trusted pointer | Gate unlocks, two running AudioContexts, menu music starts |
| Audio fallback | Chromium, suspended AudioContext | Controller-only entry shows AUDIO IS LOCKED; trusted ENABLE AUDIO recovers |
| 1v1 network | Desktop host + 390×844 mobile guest | 13/13 checks |
| 2v2 network | Two desktop + two 390×844 mobile clients | 125/125 checks |

The automated audit is `scripts/xbox-edge-check.mjs`. It writes screenshots and
`report.json` to `artifacts/xbox-edge/`. The network checks are
`scripts/verify-1v1.mjs` and `scripts/verify-2v2.mjs`.

## Required hardware

- Xbox Series S and Xbox Series X, each on a current system update.
- Microsoft Edge installed and updated on each console.
- One wired Xbox controller and one wireless Xbox controller.
- A 1080p TV and a 4K TV, or one display that can switch between them.
- A desktop browser on the same network for 1v1 and 2v2 cross-play.
- A phone on the same network for mobile cross-play.
- A second and third signed-in browser profile for the 2v2 room.

Record the console model, Edge version, display resolution, TV scale and safe
area for every run.

## Test procedure

### 1. Cold launch and display

- [ ] Launch the game in Edge on Series S. Confirm the game loads over HTTPS
      and does not require port 3000.
- [ ] Repeat on Series X.
- [ ] Set **Settings → Graphics & Display → Display Mode → Console / TV**.
- [ ] Test TV UI Scale at **100%**, **125%**, and **150%**. At each scale test
      TV Safe Area **0 px**, **24 px**, and **48 px**.
- [ ] At 100%, confirm the menu, Settings, and the entire battle board fit
      without vertical scrolling at 1080p. The hand and END TURN must both be
      fully visible.
- [ ] At 125% and 150%, confirm there is no horizontal scrolling. Scroll
      vertically to END TURN, the hand, and the move controls; all must be
      reachable and fully visible when focused.
- [ ] Confirm the Settings close button remains visible while the panel is
      scrolled to its bottom at 125% and 150%.
- [ ] Repeat on a 4K display and check for overscan at 0/24/48 px safe area.
- [ ] Confirm artwork keeps its aspect ratio and is not stretched.

### 2. Audio gate and fallback

- [ ] Cold launch. Confirm **CAN I KICK IT – THE GAME / PRESS START TO ENTER**
      is visible and no menu music is playing before entry.
- [ ] Enter with a mouse click. Confirm menu music, controller HUD, and the
      menu appear.
- [ ] Reload and enter using only the controller A button.
- [ ] If audio starts, record that Edge granted the controller press user
      activation.
- [ ] If audio stays silent, confirm **AUDIO IS LOCKED** and **ENABLE AUDIO**
      appear. Use a mouse or keyboard to activate ENABLE AUDIO. Confirm music
      starts and the notice disappears. This is the expected fallback, not a
      failed launch.
- [ ] Navigate menu → Collection → back → battle. Confirm music continues and
      is not duplicated or restarted on every screen.
- [ ] Start a battle. Confirm the battle track and DJ KICKIT clips play.
- [ ] Pause and resume. Confirm pause/resume SFX and music recovery.
- [ ] Background the app and return. Confirm audio resumes without a second
      soundtrack.

### 3. Controller access by screen

For every row, use only the controller unless the row explicitly needs a
trusted audio retry.

- [ ] **Start gate:** A enters; focus ring is visible.
- [ ] **Main menu:** D-pad/left stick reaches all eight modes and the radio.
      A opens each entry. Start opens Settings. B closes Settings.
- [ ] **Collection:** D-pad reaches filters, cards, upload and Back. A selects;
      B returns to the menu.
- [ ] **Mixtape Studio:** D-pad reaches deck slots, crate, save and Back.
      A selects/removes; B returns.
- [ ] **Ultimate Team:** D-pad reaches lineup, packs, label actions and Back.
      A selects; B returns.
- [ ] **My Artist Career:** D-pad reaches the hub actions and Back. A selects;
      B returns.
- [ ] **Settings:** D-pad reaches every section, including Display Mode, TV
      Scale, Safe Area, graphics preset and Controller / Xbox. Start/B closes.
- [ ] **Battle:** D-pad/left stick moves focus. A selects an artist or move.
      B backs out of the move dock, inspector, Backstage, pause and other
      overlays. X opens the focused card inspector. Y opens Backstage.
      LB/RB cycles hand cards. LT/RT cycles player stage, Crate, Backstage and
      rival stage. Start pauses.
- [ ] **Focus trap:** with a modal open, D-pad never moves focus behind the
      modal. Closing it returns focus to a usable control.
- [ ] **Remapping:** in Settings → Controller / Xbox, remap A, B, X, Y and one
      shoulder action. Confirm an in-use button swaps actions instead of
      creating a dead binding. Reload and confirm bindings persist.
- [ ] Disconnect the controller mid-menu. Confirm the HUD reports the pad is
      gone and mouse/keyboard remain usable. Reconnect and confirm focus works.
- [ ] Confirm no action requires a controller-only gesture that mouse and
      keyboard cannot perform.

### 4. Battle actions

- [ ] Focus a player artist and open the move dock. Perform one legal move.
- [ ] Inspect a card with X. Confirm stats, moves and status text are readable.
- [ ] Open Backstage with Y. Confirm a recall can be completed or cancelled.
- [ ] Use a Crate draw and an Encore move.
- [ ] End the turn. Confirm the turn passes and the battle SFX plays.
- [ ] Confirm the hand, stage, rival stage and END TURN never overlap at 100%,
      125% or 150%.

### 5. Networking

Run each room with the Xbox as host and again as guest.

- [ ] **1v1 with desktop:** create/join a private room, exchange the five-letter
      code, both ready, start, complete a turn on each side.
- [ ] **1v1 with mobile:** repeat with a phone on the same network.
- [ ] **2v2 with desktop + mobile:** four seats, two teams, 144 shared Crowd,
      alternating A1 → B1 → A2 → B2 turns.
- [ ] Confirm a fifth client is rejected and an empty seat can be reclaimed.
- [ ] Confirm waiting clients cannot act and cannot see another seat's hand.
- [ ] Disconnect the Xbox network briefly. Record whether the room recovers,
      reports a disconnect, or ends cleanly. Do not mark the run passed without
      recording the observed result.
- [ ] Confirm no uncaught page errors or frozen input after the room ends.

### 6. Performance and stability

- [ ] Set **XBOX EDGE — AUTO**. Confirm it never selects Ultra by itself.
- [ ] Play a full battle at 100% and 150%. Record approximate FPS and any
      stutter, audio dropouts or input lag.
- [ ] Open and close Settings, Collection, Mixtape, Ultimate Team and Career
      repeatedly. Confirm no crash, blank screen or lost controller focus.
- [ ] Leave the game idle for ten minutes. Confirm the controller still wakes
      the UI and audio remains stable.

## Results

| Run | Console | Edge version | Display | Scale | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Series S |  | 1080p | 100% |  |  |
| 2 | Series S |  | 1080p | 150% |  |  |
| 3 | Series X |  | 4K | 100% |  |  |
| 4 | Series X |  | 4K | 150% |  |  |
| 5 | Series S/X |  |  |  | 1v1 |  |
| 6 | Series S/X |  |  |  | 2v2 |  |

A run is only PASS when every checklist item in that section was observed on
the named console. Until then, the status remains:

**XBOX SERIES S: NOT HARDWARE TESTED**

**XBOX SERIES X: NOT HARDWARE TESTED**
