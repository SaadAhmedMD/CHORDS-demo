# CHORDS Command Centre — donor demo

Interactive prototype of the VCH community-beds command centre and decision engine, built for the CHORDS philanthropic pitch.
**All patient data is synthetic.** Acute site names are real; their numbers, community places and unit costs are illustrative.

Live: enable GitHub Pages (Settings → Pages → Deploy from branch → `main` / root) and open the Pages URL.

## Five scenes
1. **Tonight** — schematic map of VCH acute sites and community places; ALC, ED waits, open places, capacity held.
2. **Run the engine** — the decision engine reads the sources, matches people to the right setting, finds Hospital at Home and remote-monitoring candidates (22 acute beds released).
3. **One person** — Margaret (Hospital at Home + Medly), Joseph (long-term care near family), Daniel (brain injury, no setting fits).
4. **The next beds** — options analysis for the brain-injury cohort with sliders, 80% ranges and a self-writing executive memo.
5. **The gift** — what each scene becomes and when, five-year targets, naming card and tiers.

Presenting: **Next →** or arrow keys · 1–5 jump · **N** presenter notes · **R** run the engine (scene 2) · **Settings** for the donor's name and reset.

## Files
- `index.html` — the built, self-contained page (what Pages serves)
- `src/` — `data.js` (illustrative data), `engine.js` (matching, eligibility, options model with Monte Carlo bounds), `app.js` (UI), `style.css`, `shell.html`
- `build.py` — inlines `src/` into `index.html`: `python3 build.py`
