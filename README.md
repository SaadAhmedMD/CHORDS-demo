# The Command Centre · CHORDS at C2E2 — donor demo

A mock-up of the command centre the gift builds, run by CHORDS within C2E2 at the VCH Research Institute. It covers every bed VCH funds: acute and ALC, long-term care, supported housing, Hospital at Home and Seniors Remote Monitoring.

**All data is synthetic.** Acute site names are real; their numbers, the community places, unit costs, thresholds, alerts and events are illustrative and simulated. The "Illustrative data" label stays on every screen.

Live: enable GitHub Pages (Settings → Pages → Deploy from branch → `main` / root) and open the Pages URL. `index.html` is fully self-contained (fonts, paintings, data and code are inlined) and works offline.

## Two modes

**Live board (default).** A wall board: one 16:9 screen, no scrolling, scaled to whatever it is shown on. A status bar stays on every tab: clock, system surge level, last refresh for each data source, and the engine's schedule. Five tabs, one per function of the centre:

| Tab | What it shows |
| --- | --- |
| **Flow** (acute and ALC) | Site status tiles with thresholds and red/amber/green states, the ranked queue of people waiting with running timers, the painted night map, capacity gauges with 24-hour sparklines, the event and alert feed, and the action queue with owner and sign-off status |
| **Community beds** | Portfolio occupancy, the place board for 20 operators and programs, offers in progress, demand against open places, value for money, operator returns |
| **Home** | Hospital at Home census with early-warning scores and visit schedule, who could go home today, the Seniors Remote Monitoring triage queue |
| **CDM apps** | Five app slots. Medly (heart failure) is live: enrolled, alerts today, nurse caseload against one nurse per 250 patients, escalations, triage queue. Four slots are planned, with five candidate conditions. The apps sit in a layer that integrates with Signal 1's AI platform; that integration is labelled **proposed, to be confirmed** |
| **Decision engine** | The engine's run log (Run now), what it found, the full sign-off queue, and the options analysis in draft |

**Huddle** steps through the daily huddle agenda (nine items), switching to the board for each item and spotlighting the tiles that answer it. Talking points are read from the live figures.

**Guided tour.** The original five-scene story for the pitch, unchanged: Tonight · Run the engine · One person (Margaret, Joseph, Daniel) · The next beds · The gift. Reach it from **Guided tour** in the top bar; **Live board** returns to the wall.

## Keys
- Live board: **1–5** tabs · **← →** next tab (or huddle item) · **H** huddle · **T** guided tour · **N** presenter notes · **Esc** close
- Guided tour: **← →** scenes · **1–5** jump · **R** run the engine (scene 2) · **L** live board · **N** notes
- **Settings**: donor name (names the centre in the top bar and the closing scene), presenter notes, reset.

## Links and the web presentation
- `index.html` opens the live board; `#flow`, `#beds`, `#home`, `#cdm`, `#engine` open a tab.
- `#scene-1` … `#scene-5` open a guided-tour scene, as before.
- These globals are stable, and the web presentation drives the demo through them: `go(n)`, `runEngine()`, `openPerson(id)`, `buildPackage()`, `sendHah()`, `resetDemo()`, and the state `S.run`, `S.scene`, `S.pkg`. `go(n)`, `openPerson(id)` and `resetDemo()` always land in the guided tour. New: `setTab(id)`, `huddle(i)`, `peek(id)`, `signOff(key)`.

## How the live board works
- Every figure is computed from the synthetic data at runtime; nothing is typed into the screens.
- The clock is the real clock. A seeded simulation adds an event every few seconds (bed requests, bed assignments, ALC designations, vitals, alerts, operator returns), and every event changes the state the figures are computed from.
- Thresholds, surge rules, refresh cadences and owners are data, in `src/data_ops.js`.
- Actions move through owner sign-off → operator acceptance → bed released. Some routine drafts are signed by their owners over time; anything shown in the guided tour waits for you.

## Files
- `index.html` — the built page (what Pages serves)
- `build.py` — inlines `src/` into `index.html`: `python3 build.py`
- `src/shell.html`, `src/fonts.css` (Fraunces, DM Sans), `src/style.css`, `src/ops.css` (the wall)
- `src/images.js` (paintings), `src/data.js` (census, portfolio, personas), `src/data_ops.js` (operations layer), `src/engine.js` (matching, eligibility, options model), `src/paint.js` (the painted map)
- `src/app.js` (state, routing, guided tour), `src/live.js` (live simulation), `src/ops.js` (wall shell, Flow), `src/ops_boards.js` (other tabs, drawer, huddle), `src/boot.js`
