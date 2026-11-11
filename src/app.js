/* ============================================================
   The Command Centre, built and run by CHORDS at C2E2 — shared state, routing,
   and the guided tour (the five-scene story for the pitch). The live wall is in ops.js.
   ============================================================ */
const R = Engine.runAll(); // all results are computed up front; scene 2 animates their discovery
const D = DATA;
const store = {
  get(k, d) { try { const v = localStorage.getItem('chords.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('chords.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
const S = {
  mode: 'ops',   // ops: the live wall (default) | tour: the five-scene guided tour
  tab: 'flow',   // flow | beds | home | cdm | engine
  huddle: null,  // agenda item while huddle mode is on
  peek: null,    // person open in the drawer
  scene: 1,
  run: 'idle', // idle | running | done
  feed: [],
  shown: { lines: false, hah: false, srm: false, opps: [] },
  released: 0,
  selected: 'margaret',
  pkg: {}, sent: {},
  sl: { A: 6, B: 10, C: 6, occ: 0.9 },
  notes: store.get('notes', false),
  donor: store.get('donor', ''),
  settings: false,
};
const SCENES = [
  { n: 1, short: 'Tonight' },
  { n: 2, short: 'Run the engine' },
  { n: 3, short: 'One person' },
  { n: 4, short: 'The next beds' },
  { n: 5, short: 'The gift' },
];
const NOTES = {
  1: 'Open on the whole system, not one hospital. Tonight about 220 people are in acute beds they no longer need. The places they need sit in VCH’s own portfolio, spread across five systems nobody sees together. Thirteen are open right now, and the ward teams can’t see them.',
  2: 'Press Run. The engine reads Cerner, PARIS, operator returns, contracts and finance, and screens every inpatient through Signal 1. Watch it place 13 people, find 5 patients for Hospital at Home and 4 who can go home with remote monitoring: 22 acute beds today. Sustained, that is about $8.8M of acute capacity a year. It also finds who can be followed on Medly after they leave.',
  3: 'Make it human. Margaret, the day after her hip repair, goes home with Hospital at Home, remote monitoring and Medly for her heart failure. Joseph gets the long-term-care bed near his daughter. Daniel has nowhere to go: nothing in VCH’s portfolio fits a 49-year-old with a brain injury. He is one of 23.',
  4: 'This is the decision engine. For Daniel’s cohort it compares three ways to create capacity and gives honest ranges, not a single number. Move the sliders. This is the question VCH cannot answer today: what should the next beds be?',
  5: 'Everything here is a prototype on illustrative data. The gift makes it real through three early wins: Signal 1 unlocked by Month 9, Medly live by Month 9 with more chronic-disease apps to follow, and the community-bed board by Month 12. The command centre carries your name. CHORDS, within C2E2 at the VCH Research Institute, builds and runs it, and VCH sustains it from Year 6.',
};

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n0 = (v) => Math.round(v).toLocaleString('en-CA');
const money = (v) => '$' + n0(v);
const moneyM = (v) => (v < 0 ? '−' : '') + '$' + (Math.abs(v) / 1e6).toFixed(1) + 'M';
const moneyK = (v) => '$' + Math.round(v / 1000).toLocaleString('en-CA') + 'K';
const site = (id) => Engine.siteById[id];
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const tip = (text, src) => `data-tip="${esc(text)}"${src ? ` data-src="${esc(src)}"` : ''}`;
const PAL = { ink: '#0E1626', light: '#EEE8DD', body: '#BAC3CF', amber: '#E3A857', amberL: '#F2C97A', blue: '#8DB8E0', coral: '#E58C6E', sage: '#9CC8A6', mauve: '#C3A6D8', teal: '#7FC4C0', rose: '#E9A3B5' };
const TYPE_COL = { ltc: PAL.light, ltcs: PAL.light, al: PAL.teal, sh: PAL.sage, cch: PAL.rose, hhs: PAL.mauve };
const TYPE_LAB = { ltc: 'Long-term care', ltcs: 'Secured long-term care', al: 'Assisted living', sh: 'Supported housing', cch: 'Complex care housing', hhs: 'Home health' };

// ---------- routing ----------
// go(n) opens scene n of the guided tour (the web presentation drives the demo through it)
function go(n) {
  n = Math.max(1, Math.min(5, n));
  S.mode = 'tour'; S.huddle = null; S.peek = null;
  if (location.hash !== '#scene-' + n) location.hash = 'scene-' + n; else { S.scene = n; render(); }
}
function fromHash() {
  const m = /^#scene-([1-5])$/.exec(location.hash), t = /^#(flow|beds|home|cdm|engine)$/.exec(location.hash);
  if (m) { S.mode = 'tour'; S.scene = +m[1]; }
  else { S.mode = 'ops'; S.tab = t ? t[1] : 'flow'; }
  render();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', fromHash);

// ---------- shell ----------
function render() {
  if (S.mode === 'ops') return renderOps();
  document.body.classList.remove('ops');
  const settled = S.run !== 'running';
  const brandName = S.donor ? `The ${esc(S.donor)} Command Centre` : 'The Command Centre';
  $('app').className = (settled ? 'settled' : '') + (S.notes ? ' notes-on' : '');
  $('app').innerHTML = `
  <header class="top">
    <div class="brand">${logoSVG(30)}<div><div class="brand-name">${brandName}</div><div class="brand-sub">Built and run by CHORDS at C2E2, VCH Research Institute</div></div></div>
    <nav class="steps" aria-label="Guided tour scenes">${SCENES.map((s) => `<button class="step${S.scene === s.n ? ' on' : ''}" onclick="go(${s.n})" aria-current="${S.scene === s.n ? 'step' : 'false'}"><b>${s.n}</b><span>${s.short}</span></button>`).join('')}</nav>
    <div class="top-right">
      <button class="tbtn live" onclick="setTab(S.tab)" ${tip('Leave the guided tour and return to the live operations wall. Key L.')}>Live board</button>
      <span class="chip-demo" ${tip('Patients, places and costs are synthetic. Acute site names are real; their numbers are illustrative.')}>Illustrative data</span>
      <button class="tbtn${S.notes ? ' on' : ''}" onclick="toggleNotes()" aria-pressed="${S.notes}">Notes</button>
      <button class="tbtn" onclick="openSettings()">Settings</button>
      <button class="tbtn" onclick="go(${S.scene - 1})" ${S.scene === 1 ? 'disabled' : ''} aria-label="Previous scene">←</button>
      <button class="tbtn next" onclick="go(${S.scene + 1})" ${S.scene === 5 ? 'disabled' : ''} aria-label="Next scene">Next</button>
    </div>
  </header>
  <main class="wrap">${[null, scene1, scene2, scene3, scene4, scene5][S.scene]()}</main>
  ${S.notes ? `<div class="notes"><b>Scene ${S.scene} ·</b><span>${esc(NOTES[S.scene])}</span></div>` : ''}
  ${S.settings ? settingsHTML() : ''}`;
  afterRender();
}

function logoSVG(sz) {
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="none" stroke="#8DB8E0" stroke-width="1.5" opacity=".55"/><circle cx="16" cy="16" r="9.5" fill="none" stroke="#E3A857" stroke-width="1.5"/><circle cx="16" cy="16" r="4.5" fill="#F2C97A"/></svg>`;
}

function headHTML(eyebrow, title, sub, right = '') {
  return `<div class="head"><div><div class="eyebrow">${eyebrow}</div><h1 class="title">${title}</h1><p class="subtitle">${sub}</p></div>${right}</div>`;
}

// ---------- scene 1 & 2: command centre ----------
function tilesHTML() {
  const C = R.cen;
  const after = S.run !== 'idle';
  return `<div class="tiles">
    <div class="tile"><div class="lab">ALC patients in acute beds today</div><div class="big">${n0(C.total)}</div>
      <div class="sub" ${tip('VCH Health Care Report Card, July 2025 (April 2024 to March 2025).', 'vch.report_card.alc_days_share')}>11.1% of hospital days last year; target 10.4%</div></div>
    <div class="tile"><div class="lab">Emergency patients waiting for a bed</div><div class="big">${n0(C.edWaiting)}</div>
      <div class="sub" ${tip('VCH Health Care Report Card, July 2025.', 'vch.report_card.ed_admit_10h')}>35.8% admitted within 10 hours last year; target 58%</div></div>
    <div class="tile lime"><div class="lab">Community places open right now</div><div class="big">${R.cap.openResidential}</div>
      <div class="sub">across 4 portfolios; ward teams can’t see them</div></div>
    ${after
      ? `<div class="tile good"><div class="lab">Acute beds released today</div><div class="big" id="releasedBig">${S.run === 'done' ? R.released : S.released}</div>
         <div class="sub" ${tip('22 beds × $1,090 per ALC day × 365 days. Capacity returned to emergency and surgical patients, not cash.', 'costs.alc_day')}>≈ ${moneyM(R.valueYr)} a year of acute capacity if sustained</div></div>`
      : `<div class="tile alert"><div class="lab">Acute capacity held by ALC today</div><div class="big">${moneyK(C.total * D.costs.alcDay)}</div>
         <div class="sub" ${tip('Sutherland et al. 2019 estimate of $1,090 per ALC bed-day (2016 dollars): conservative.', 'costs.alc_day')}>a day, at a conservative $1,090 per ALC day</div></div>`}
  </div>`;
}

const LABEL_DIR = { vgh: 'left', sph: 'left', msj: 'right', ubch: 'right', rh: 'left', lgh: 'left' };

function mapHTML() {
  const OUT = `stroke="#0A111D" stroke-width="1.6" paint-order="stroke"`;
  const hoods = D.neighbourhoods.map(([n, lat, lon]) => { const [x, y] = px({ lat, lon }); return `<text x="${x}" y="${y}" text-anchor="middle" font-size="9.5" letter-spacing="1.4" fill="${PAL.light}" opacity=".5" font-family="DM Sans, sans-serif" paint-order="stroke" stroke="#0A111D" stroke-width="2.5">${n.toUpperCase()}</text>`; }).join('');
  const nodes = D.nodes.map((nd) => {
    const [x, y] = px(nd); const c = TYPE_COL[nd.type];
    const halo = nd.open > 0 ? `<circle cx="${x}" cy="${y}" r="13" fill="${PAL.amber}" class="halo"/><circle cx="${x}" cy="${y}" r="10.5" fill="none" stroke="${PAL.amberL}" stroke-width="1.4"/>` : '';
    let shape;
    if (nd.type === 'ltc') shape = `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${c}" ${OUT}/>`;
    else if (nd.type === 'ltcs') shape = `<rect x="${x - 6.5}" y="${y - 6.5}" width="13" height="13" fill="#0A111D"/><rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="none" stroke="${c}" stroke-width="2.2"/>`;
    else if (nd.type === 'al') shape = `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${c}" ${OUT} transform="rotate(45 ${x} ${y})"/>`;
    else if (nd.type === 'sh') shape = `<path d="M${x} ${y - 7} L${x + 6.5} ${y + 5} L${x - 6.5} ${y + 5} Z" fill="${c}" ${OUT}/>`;
    else if (nd.type === 'cch') shape = `<circle cx="${x}" cy="${y}" r="6" fill="${c}" ${OUT}/>`;
    else shape = `<path d="M${x - 6} ${y + 5} V${y - 1} L${x} ${y - 7} L${x + 6} ${y - 1} V${y + 5} Z" fill="${c}" ${OUT}/>`;
    return `<g ${tip(`${nd.name}${nd.program ? '' : ` · ${nd.beds} places`} · ${nd.open} open now`, 'paris.community_capacity')}>${halo}${shape}</g>`;
  }).join('');
  const sites = D.sites.filter((s) => !s.coastal).map((s) => {
    const [x, y] = px(s); const r = 7 + Math.sqrt(s.alc) * 1.5;
    const right = LABEL_DIR[s.id] !== 'left';
    return `<g ${tip(`${s.name}: ${s.alc} ALC patients, ${s.edWaiting} emergency patients waiting for a bed`, 'cerner.adt_census')}>
      <circle cx="${x}" cy="${y}" r="${r + 4}" fill="${PAL.blue}" opacity=".22"/>
      <circle cx="${x}" cy="${y}" r="${r}" fill="${PAL.blue}" stroke="#0A111D" stroke-width="2"/>
      <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${PAL.ink}" font-family="DM Sans, sans-serif">${s.alc}</text>
      <text x="${right ? x + r + 7 : x - r - 7}" y="${y + 4}" text-anchor="${right ? 'start' : 'end'}" font-size="12" font-weight="600" fill="${PAL.light}" font-family="DM Sans, sans-serif" paint-order="stroke" stroke="#0A111D" stroke-width="3.5">${s.short}</text></g>`;
  }).join('');
  return `<div class="mapwrap map"><svg viewBox="0 0 ${MAP.w} ${MAP.h}" role="img" aria-label="Painted schematic map of VCH acute sites and community places at night">
    ${hoods}<g id="mapLines">${linesHTML()}</g>${nodes}${sites}</svg>
</div>
    <div class="legend">
      <span><i style="background:${PAL.blue};border-radius:50%"></i>Acute site (ALC today)</span>
      <span><i style="background:${PAL.light}"></i>Long-term care</span>
      <span><i style="border:2px solid ${PAL.light}"></i>Secured LTC</span>
      <span><i style="background:${PAL.teal};transform:rotate(45deg)"></i>Assisted living</span>
      <span><i style="background:${PAL.sage};clip-path:polygon(50% 0,100% 100%,0 100%)"></i>Supported housing</span>
      <span><i style="background:${PAL.rose};border-radius:50%"></i>Complex care housing</span>
      <span><i style="background:${PAL.mauve};clip-path:polygon(0 100%,0 45%,50% 0,100% 45%,100% 100%)"></i>Home health</span>
      <span><i style="border:1.5px solid ${PAL.amberL};background:rgba(227,168,87,.5);border-radius:50%"></i>Open now</span>
    </div>
    <div class="srcnote">Coastal sites, not shown: ${D.sites.filter((s) => s.coastal).map((s) => `${s.short} ${s.alc} ALC`).join(' · ')}. Painted schematic, not to scale; community place names are generic.</div>`;
}

function curve(a, b, bend = 0.18) {
  const [x1, y1] = a, [x2, y2] = b; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1; return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(mx - dy * bend).toFixed(1)} ${(my + dx * bend).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}
function homeSpot(p, i) { const [x, y] = px(site(p.site)); const a = (i * 2.4) + (p.id.length % 3); return [x + Math.cos(a) * 48, y + Math.sin(a) * 40]; }
function linesHTML(part) {
  const anim = S.run === 'running';
  const st = (len, delay) => anim ? `stroke-dasharray="${len}" stroke-dashoffset="${len}" style="animation-delay:${delay}s"` : '';
  let out = '';
  if ((part === undefined && S.shown.lines) || part === 'lines') {
    out += R.matches.map((m, i) => { const s = site(m.patient.site); if (s.coastal) return ''; return `<path class="mline" d="${curve(px(s), px(m.node))}" stroke="${PAL.amberL}" ${st(500, i * 0.08)}/>`; }).join('');
  }
  const homes = (list, col, key) => list.map((p, i) => { const s = site(p.site); if (s.coastal) return ''; const h = homeSpot(p, i + (key === 'srm' ? 7 : 0));
    return `<path class="mline" d="${curve(px(s), h, 0.3)}" stroke="${col}" ${anim ? `stroke-dasharray="300" stroke-dashoffset="300" style="animation-delay:${i * 0.1}s"` : 'stroke-dasharray="4 4"'}/>
      <path class="popin" d="M${(h[0] - 5).toFixed(1)} ${(h[1] + 4).toFixed(1)} v-5 l5 -5 l5 5 v5 z" fill="${col}" stroke="#0A111D" stroke-width="1.4" paint-order="stroke"/>`; }).join('');
  if ((part === undefined && S.shown.hah) || part === 'hah') out += homes(R.hah.eligible, PAL.blue, 'hah');
  if ((part === undefined && S.shown.srm) || part === 'srm') out += homes(R.srm, PAL.mauve, 'srm');
  return out;
}

function portfolioHTML() {
  const rows = D.portfolio.map((p) => `<tr><td>${esc(p.label)}</td><td class="r">${n0(p.places)}</td>
    <td class="r"><span class="pill ${p.open > 0 ? 'open' : 'zero'}">${p.virtual ? p.open + ' slots' : p.open}</span></td>
    <td class="r" ${tip('Illustrative cost per bed-night. Replacing these with VCH’s own unit costs is one of CHORDS’ first jobs.', p.src)}>${money(p.costNight)}</td></tr>`).join('');
  return `<div class="card"><h3>Community portfolio <small>places · open now · cost per night</small></h3>
    <table><thead><tr><th>Type</th><th class="r">Places</th><th class="r">Open</th><th class="r">Per night</th></tr></thead><tbody>${rows}
    <tr><td><b>Acute bed, patient ready to leave</b></td><td class="r">–</td><td class="r">–</td><td class="r"><b ${tip('Conservative estimate (Sutherland et al. 2019).', 'costs.alc_day')}>${money(D.costs.alcDay)}</b></td></tr></tbody></table>
    <div class="srcnote">These figures live in five separate systems today.</div></div>`;
}

function sitesHTML() {
  const max = Math.max(...D.sites.map((s) => s.alc));
  return `<div class="card"><h3>ALC by acute site <small>patients ready to leave · emergency patients waiting</small></h3>
    <table><tbody>${D.sites.map((s) => `<tr><td style="width:38%">${esc(s.short)}${s.org === 'Providence' ? ' <span class="pill">Providence</span>' : ''}</td>
      <td><div class="bar"><span style="width:${(s.alc / max * 100).toFixed(0)}%"></span></div></td>
      <td class="r" style="width:48px"><b>${s.alc}</b></td><td class="r" style="width:64px;color:var(--coral)">${s.edWaiting} ED</td></tr>`).join('')}</tbody></table></div>`;
}

function feedsHTML() {
  const f = ['Cerner census', 'PARIS', 'Operator returns', 'Contracts', 'Finance ledger'];
  return `<div class="feeds"><span>Feeding this view</span>${f.map((n) => `<span class="feed"><i></i>${n}</span>`).join('')}
    <span class="feed s1" ${tip('Today data reaches Signal 1 by manual file transfer. An automated, governed feed is the first thing the gift builds, and it makes Signal 1 the platform for AI across VCH.', 'early win 1 · month 9')}><i></i>Signal 1, automated feed</span></div>`;
}

function scene1() {
  return headHTML('Command centre · tonight', 'Tonight across Vancouver Coastal Health',
    'Every acute bed held by someone who is ready to leave, and every community place that could take them. Today this picture is spread across five systems.',
    `<button class="btn primary" onclick="go(2)">Run the decision engine</button>`)
    + tilesHTML() + feedsHTML()
    + `<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
        <div class="card"><h3>VCH acute sites and community places <small>tonight</small></h3>${mapHTML()}</div>
        <div class="grid tight" style="align-content:start">${portfolioHTML()}${sitesHTML()}</div></div>`;
}

// opportunities discovered by the engine
const OPPS = [
  { id: 'place', sev: PAL.sage, t: () => `Place ${R.matches.length} people into open community places today`,
    s: () => { const c = {}; R.matches.forEach((m) => { c[m.node.type] = (c[m.node.type] || 0) + 1; }); return Object.entries(c).map(([k, v]) => `${TYPE_LAB[k]} ${v}`).join(' · ') + ' · referrals drafted, awaiting sign-off'; },
    a: () => `<button class="btn" onclick="openPerson('joseph')">Review</button>` },
  { id: 'hah', sev: PAL.blue, t: () => `${R.hah.eligible.length} inpatients can be treated at home`,
    s: () => `Hospital at Home · ${n0(R.hah.screened)} inpatients screened with Signal 1 and program criteria`,
    a: () => `<button class="btn" onclick="openPerson('margaret')">Review</button>` },
  { id: 'srm', sev: PAL.mauve, t: () => `${R.srm.length} patients can go home today with remote monitoring`,
    s: () => 'Seniors Remote Monitoring kit plus home support · discharge plans drafted', a: () => `<button class="btn" onclick="openPerson('${R.srm[0].id}')">Review</button>` },
  { id: 'cdm', sev: PAL.teal, t: () => `${R.cdm.n} people leaving today can be followed on Medly`,
    s: () => 'Heart failure · one nurse follows up to 250 patients at home · the first of five chronic-disease apps',
    a: () => `<button class="btn" onclick="openPerson('margaret')">Review</button>` },
  { id: 'none', sev: PAL.coral, t: () => `No suitable setting exists for ${R.rem.noSetting} people`,
    s: () => `${R.rem.by.abi} with a brain injury · ${R.rem.by.complex} with complex concurrent needs · options analysis drafted`,
    a: () => `<button class="btn primary" onclick="go(4)">Open analysis</button>` },
  { id: 'contracts', sev: PAL.amber, t: () => `${R.contracts.rows.length} housing contracts under 75% occupied for 90 days`,
    s: () => `${R.contracts.empty} empty units ≈ ${moneyK(R.contracts.costYr)} a year · renegotiation brief drafted`, a: () => `<span class="pill warn">Value for money</span>` },
  { id: 'mismatch', sev: PAL.body, t: () => `${R.mismatches.stepUp + R.mismatches.stepDown} community residents in the wrong level of support`,
    s: () => `${R.mismatches.stepUp} need more care than their housing provides · ${R.mismatches.stepDown} could step down from long-term care`, a: () => `<span class="pill">Review queue</span>` },
];
function oppHTML(o) {
  return `<div class="opp"><div class="sev" style="background:${o.sev}"></div><div><div class="ot">${o.t()}</div><div class="os">${o.s()}</div></div><div>${o.a()}</div></div>`;
}

function scene2() {
  const opps = S.run === 'done' ? OPPS : OPPS.filter((o) => S.shown.opps.includes(o.id));
  const before = `<div class="card"><h3>What the engine will do</h3>
    <table><tbody>
      <tr><td>Read the acute census and every community place</td><td class="r"><span class="pill">Cerner · PARIS · operators</span></td></tr>
      <tr><td>Price each bed type</td><td class="r"><span class="pill">finance ledger · contracts</span></td></tr>
      <tr><td>Match people to the right setting</td><td class="r"><span class="pill">case-mix model</span></td></tr>
      <tr><td>Find patients who can be treated or monitored at home</td><td class="r"><span class="pill ocean">Signal 1 · program criteria</span></td></tr>
      <tr><td>Find who can be followed on a chronic-disease app</td><td class="r"><span class="pill">Medly · clinic criteria</span></td></tr>
      <tr><td>Flag contracts and residents that don’t fit</td><td class="r"><span class="pill">contracts database</span></td></tr>
      <tr><td>Draft the case for capacity that doesn’t exist yet</td><td class="r"><span class="pill">decision engine</span></td></tr>
    </tbody></table><div class="srcnote">Every action is a draft. Nothing moves without a person’s sign-off. Each model the engine uses is registered and monitored on Signal 1.</div></div>`;
  const oppCard = `<div class="card"><h3>What the engine found <small>${S.run === 'done' ? OPPS.length + ' opportunities' : 'scanning…'}</small></h3><div id="oppList">${opps.map(oppHTML).join('')}</div></div>`;
  return headHTML('Command centre · decision engine', 'Run the decision engine',
    'The engine reads every source, matches people to the right setting, and drafts what leaders need to sign. Nothing moves without a person’s approval.')
    + `<div class="cc withEngine"><div>${tilesHTML()}
      <div class="grid" style="grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);align-items:start">
        <div class="card"><h3>Matches across the region</h3>${mapHTML()}</div>
        ${S.run === 'idle' ? before : oppCard}
      </div></div>${engineHTML()}</div>`;
}

function engineHTML() {
  return `<aside class="engine" aria-label="Decision engine activity">
    <div class="engine-h">${logoSVG(26)}<div><div class="t">Decision engine</div><div class="s">${S.run === 'running' ? '<span class="spin"></span>Running' : S.run === 'done' ? 'Done. Every figure is traced to a source.' : 'Ready'}</div></div></div>
    <div class="engine-feed" id="feed">${S.feed.map(feedItem).join('') || `<div class="think">Ready. Press Run to read tonight’s data across all nine acute sites and the community portfolio.</div>`}</div>
    <div class="engine-f">${S.run === 'idle' ? `<button class="btn lime" onclick="runEngine()" style="flex:1">Run the engine</button>` : S.run === 'running' ? `<button class="btn" onclick="skipEngine()" style="flex:1">Skip to results</button>` : `<div class="stat">Acute beds released today<br><b>${R.released}</b></div><button class="btn" onclick="go(3)" style="margin-left:auto">See the people</button>`}</div>
  </aside>`;
}
function feedItem(f) {
  if (f.think) return `<div class="think">${esc(f.think)}</div>`;
  return `<div class="tool"><span class="n">▸ ${esc(f.tool)}</span> <span class="src">${esc(f.src)}</span><div class="fres">→ ${esc(f.res)}</div></div>`;
}

const STEPS = () => [
  { think: 'Reading tonight’s data. Joining the acute census to every community place VCH funds.' },
  { tool: 'get_acute_census', src: 'Cerner ADT', res: `${n0(D.occupiedAcute)} inpatients · ${R.cen.total} ALC across ${D.sites.length} sites · ${R.cen.edWaiting} ED patients waiting` },
  { tool: 'get_community_capacity', src: 'PARIS · operator returns', res: `${n0(R.cap.places)} community places · ${R.cap.openResidential} open now` },
  { tool: 'get_unit_costs', src: 'finance ledger · contracts', res: `cost per bed-night for ${D.portfolio.length} bed types (illustrative)` },
  { tool: 'score_needs', src: 'case-mix model', res: `${R.cen.total} people tiered by care need and setting fit` },
  { think: 'Matching people to open places, longest wait first, closest suitable place.' },
  { tool: 'match_to_setting', src: 'decision engine', res: `${R.matches.length} placements · ${matchSummary()}`, on: 'lines', add: R.matches.length, opp: 'place' },
  { tool: 'screen_hospital_at_home', src: 'Signal 1 · program criteria', res: `${R.hah.eligible.length} eligible of ${n0(R.hah.screened)} inpatients screened`, on: 'hah', add: R.hah.eligible.length, opp: 'hah' },
  { tool: 'screen_remote_monitoring', src: 'PARIS · SRM census', res: `${R.srm.length} can go home with Seniors Remote Monitoring`, on: 'srm', add: R.srm.length, opp: 'srm' },
  { tool: 'screen_chronic_disease_apps', src: 'Medly · clinic criteria', res: `${R.cdm.n} people leaving today with heart failure can be followed on Medly`, opp: 'cdm' },
  { tool: 'review_contracts', src: 'contracts database', res: `${R.contracts.rows.length} contracts under 75% occupied for 90 days · ${R.contracts.empty} empty units`, opp: 'contracts' },
  { tool: 'find_mismatches', src: 'PARIS · assessments', res: `${R.mismatches.stepUp + R.mismatches.stepDown} residents in the wrong level of support`, opp: 'mismatch' },
  { think: `${R.rem.noSetting} people still have nowhere to go. Nothing in the portfolio fits them. Checking what VCH could build or buy instead.` },
  { tool: 'analyse_unmet_need', src: 'decision engine', res: `brain-injury cohort (${R.abi.n}) · 3 options modelled · draft for the executive`, opp: 'none' },
  { tool: 'log_model_use', src: 'Signal 1 · AI registry', res: '3 models used tonight · all monitored · no drift flagged' },
];
function matchSummary() { const c = {}; R.matches.forEach((m) => { c[m.node.type] = (c[m.node.type] || 0) + 1; }); return Object.entries(c).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · '); }

let runTimer = null;
function runEngine() {
  if (S.run !== 'idle') return;
  S.run = 'running'; S.feed = []; S.released = 0; S.shown = { lines: false, hah: false, srm: false, opps: [] };
  render();
  const steps = STEPS();
  let i = 0;
  const next = () => {
    if (i >= steps.length) return finishEngine();
    const st = steps[i++];
    S.feed.push(st);
    const feed = $('feed');
    if (feed) { if (S.feed.length === 1) feed.innerHTML = ''; feed.insertAdjacentHTML('beforeend', feedItem(st)); feed.scrollTop = feed.scrollHeight; }
    if (st.on) { S.shown[st.on] = true; const g = $('mapLines'); if (g) g.insertAdjacentHTML('beforeend', linesHTML(st.on)); }
    if (st.add) countUp(S.released, S.released + st.add), S.released += st.add;
    if (st.opp) { S.shown.opps.push(st.opp); const ol = $('oppList'); const o = OPPS.find((x) => x.id === st.opp); if (ol && o) ol.insertAdjacentHTML('beforeend', (S.mode === 'ops' ? engOppHTML : oppHTML)(o)); }
    runTimer = setTimeout(next, reduced() ? 60 : st.think ? 1000 : 820);
  };
  next();
}
function countUp(from, to) {
  const el = $('releasedBig'); if (!el) return;
  const t0 = performance.now(), dur = reduced() ? 1 : 700;
  const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function finishEngine() {
  clearTimeout(runTimer);
  S.run = 'done'; S.released = R.released; S.feed = STEPS(); S.shown = { lines: true, hah: true, srm: true, opps: OPPS.map((o) => o.id) };
  render();
  toast(S.mode === 'ops' ? `Engine run complete: ${R.released} bed moves drafted for sign-off` : `${R.released} acute beds released today, pending sign-off`);
}
function skipEngine() { finishEngine(); }
function ensureRun() { if (S.run === 'idle') { S.run = 'done'; S.released = R.released; S.feed = STEPS(); S.shown = { lines: true, hah: true, srm: true, opps: OPPS.map((o) => o.id) }; } }

// ---------- scene 3: one person ----------
const NEED_PROFILES = {
  ltc: [['Personal care', 0.8], ['Mobility support', 0.7], ['Nursing oversight', 0.45], ['Supervision', 0.3], ['Behaviour support', 0.1]],
  al: [['Meals and housekeeping', 0.7], ['Medication support', 0.5], ['Personal care', 0.35], ['Supervision', 0.2], ['Nursing oversight', 0.15]],
  sh: [['Housing', 0.9], ['Mental health support', 0.6], ['Medication support', 0.55], ['Supervision', 0.25], ['Personal care', 0.1]],
  home: [['Home support visits', 0.6], ['Remote monitoring', 0.5], ['Nursing visits', 0.35], ['Personal care', 0.3], ['Supervision', 0.1]],
  abi: [['24-hour supervision', 0.9], ['Behaviour support', 0.8], ['Psychiatry and medication management', 0.65], ['Personal care', 0.35], ['Mobility support', 0.15]],
  complex: [['Housing', 0.95], ['Mental health and substance use support', 0.75], ['Wound or medical care', 0.7], ['Supervision', 0.5], ['Personal care', 0.4]],
};
const FIT_TEMPLATES = {
  abi: [['Long-term care', false, 'Declined: behaviours; under 65'], ['Secured long-term care', false, 'No vacancy; built for dementia, not brain injury'], ['Assisted living', false, 'Needs 24-hour supervision'], ['Supported housing', false, 'Care needs exceed staffing model'], ['Complex care housing', false, 'No vacancy (140 of 140 places full)'], ['Home with supports', false, 'No safe home to return to']],
  complex: [['Long-term care', false, 'Under 65; active substance use'], ['Assisted living', false, 'Nursing needs too high'], ['Supported housing', false, 'Wound care exceeds staffing model'], ['Complex care housing', false, 'No vacancy (140 of 140 places full)'], ['Shelter', false, 'Unsafe: would likely be readmitted'], ['Home with supports', false, 'No home']],
};

function personList() {
  const placed = R.matches.filter((m) => !m.patient.persona).slice(0, 3).map((m) => ({ key: m.patient.id, p: m.patient, kind: 'match', m }));
  const jm = R.matches.find((m) => m.patient.persona === 'joseph');
  const srm = R.srm.slice(0, 1).map((p) => ({ key: p.id, p, kind: 'srm' }));
  const none = R.rem.rest.filter((p) => (p.need === 'abi' || p.need === 'complex') && !p.persona).sort((a, b) => b.days - a.days).slice(0, 2).map((p) => ({ key: p.id, p, kind: 'none' }));
  return {
    go: [{ key: 'margaret', p: D.personas.margaret, kind: 'hah' }, { key: 'joseph', p: jm.patient, kind: 'match', m: jm }, ...placed, ...srm],
    none: [{ key: 'daniel', p: D.patients.find((p) => p.persona === 'daniel'), kind: 'none' }, ...none],
  };
}
function openPerson(key) { ensureRun(); S.selected = key; go(3); if (S.scene === 3) render(); }

function scene3() {
  ensureRun();
  const L = personList();
  const all = [...L.go, ...L.none];
  const cur = all.find((x) => x.key === S.selected) || all[0];
  const row = (x) => `<button class="prow${x.key === cur.key ? ' on' : ''}" onclick="S.selected='${x.key}';render()"><div class="pn">${esc(x.p.name)}, ${x.p.age}</div>
    <div class="pd">${esc(site(x.p.site).short)} · ${x.kind === 'hah' ? 'inpatient day ' + x.p.days : x.p.days + ' days ready to leave'}</div>
    <div class="pd" style="margin-top:3px">${x.kind === 'hah' ? '<span class="pill ocean">Hospital at Home</span>' : x.kind === 'srm' ? '<span class="pill home">Home with remote monitoring</span>' : x.kind === 'match' ? `<span class="pill good">${esc(TYPE_LAB[x.m.node.type])}</span>` : '<span class="pill zero">No setting fits</span>'}</div></button>`;
  return headHTML('One person at a time', 'Behind every number is a person',
    'What the engine found tonight for the people behind the census. Names and details are fictional.')
    + `<div class="person"><div class="card plist" style="padding:0;overflow:hidden">
        <div class="grp">Can leave hospital now</div>${L.go.map(row).join('')}
        <div class="grp">No setting fits</div>${L.none.map(row).join('')}</div>
      <div class="card bleed">${personDetail(cur)}</div></div>`;
}

function needsHTML(list) {
  return list.map(([l, v]) => `<div class="need"><span>${esc(l)}</span><div class="bar"><span style="width:${Math.round(v * 100)}%;background:${v > 0.7 ? PAL.amber : v > 0.4 ? PAL.blue : '#52627C'}"></span></div></div>`).join('');
}

function personDetail(x) {
  const p = x.p; const s = site(p.site);
  const initials = p.name.split(' ').map((w) => w[0]).join('').replace('.', '');
  const meta = `${esc(p.id)} · ${esc(s.name)}${p.unit ? ' · ' + esc(p.unit) : ''} · ${x.kind === 'hah' ? 'acute inpatient, day ' + p.days : 'ready to leave for ' + p.days + ' days'}`;
  const home = p.persona === 'margaret' && S.pkg.margaret === 'sent';
  const metaNow = home ? `${esc(p.id)} · Hospital at Home · her bed on ${esc(p.unit)} at VGH is free for the next patient` : meta;
  const art = p.persona === 'margaret' ? (home ? IMG.home : IMG.margaret) : p.persona === 'daniel' ? IMG.daniel : null;
  const cap = p.persona === 'margaret' ? (home ? 'Home, with Hospital at Home watching over her' : `Day ${p.days} on ${p.unit}, ready for care at home`) : `Day ${p.days} on ${p.unit}, and nowhere to go`;
  const head = art
    ? `<div class="hero"><div class="art" style="background-image:url(${art})" role="img" aria-label="Painting of ${esc(p.name.split(' ')[0])}"></div><div class="cap">${esc(cap)}</div><h2>${esc(p.name)}, ${p.age}</h2><div class="pmeta">${metaNow}</div></div>`
    : `<div class="ph"><div class="avatar">${esc(initials)}</div><div><h2>${esc(p.name)}, ${p.age}</h2><div class="pmeta">${meta}</div></div></div>`;
  const pres = `<div class="eyebrow">Presentation</div><p style="margin:0 0 16px;max-width:75ch;color:var(--light);font-size:15px">${esc(p.presentation || `${p.dx}. Medically ready to leave hospital for ${p.days} days at ${s.short}. Needs: ${D.needMeta[p.need].label.toLowerCase()}.`)}</p>`;
  if (x.kind === 'hah') return head + pres + hahHTML(p);
  if (x.kind === 'match') return head + pres + `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div><div class="eyebrow">Needs profile</div>${needsHTML(p.needsProfile || NEED_PROFILES[p.need])}</div>
      <div><div class="eyebrow">Open place the engine found</div>${matchCard(x)}</div></div>`;
  if (x.kind === 'srm') return head + pres + `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div><div class="eyebrow">Needs profile</div>${needsHTML(NEED_PROFILES.home)}</div>
      <div><div class="eyebrow">Discharge plan the engine drafted</div><div class="card inset">
        <div style="font-weight:600;color:var(--light)">Home with Seniors Remote Monitoring</div>
        <div class="kv"><span>Remote monitoring kit</span><b>1 of ${D.portfolio.find((q) => q.id === 'srm').open} open slots</b></div>
        <div class="kv"><span>Home support</span><b>2 visits a day</b></div><div class="kv"><span>Nurse check-in</span><b>daily for 2 weeks</b></div>
        ${actionBtn(x.key, 'Send discharge plan for sign-off', 'Discharge plan sent for sign-off')}</div></div></div>`;
  // no setting fits
  const fits = p.fit || FIT_TEMPLATES[p.need] || FIT_TEMPLATES.complex;
  const isAbi = p.need === 'abi';
  return head + pres + `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)">
      <div><div class="eyebrow">Needs profile</div>${needsHTML(p.needsProfile || NEED_PROFILES[p.need])}</div>
      <div><div class="eyebrow">Does any setting fit?</div>${fits.map(([n, ok, why]) => `<div class="fit"><span class="x ${ok ? 'yes' : 'no'}">${ok ? '✓' : '✕'}</span><b style="font-weight:600">${esc(n)}</b><span>${esc(why)}</span></div>`).join('')}</div></div>
    <div class="callout" style="margin-top:16px;display:flex;gap:16px;align-items:center;justify-content:space-between">
      <div>${esc(p.name.split(' ')[0])} is one of <b>${isAbi ? R.abi.n : R.rem.by.complex} people</b> ${isAbi ? `across ${R.abi.sites} sites with a brain injury and nowhere that fits. Together they hold <b>${n0(R.abi.bedDaysYr)} acute bed-days a year</b>.` : 'with complex concurrent needs and no setting that fits.'}</div>
      ${isAbi ? `<button class="btn lime" onclick="go(4)">Open the options analysis</button>` : `<button class="btn lime" onclick="go(4)">See how the engine analyses a cohort</button>`}</div>`;
}

function matchCard(x) {
  const nd = x.m.node;
  return `<div class="card inset">
    <div style="font-weight:600;color:var(--light)">${esc(nd.name)}</div>
    <div class="kv"><span>Open place</span><b>1 ${nd.program ? 'home-support slot' : 'bed'} · available now</b></div>
    <div class="kv"><span>Distance from ${esc(site(x.p.site).short)}</span><b>${x.m.km.toFixed(1)} km</b></div>
    <div class="kv"><span>Meets care needs</span><b style="color:var(--sage)">Yes</b></div>
    ${x.p.persona === 'joseph' ? '<div class="kv"><span>Near family</span><b style="color:var(--sage)">Yes, 2 km from his daughter</b></div>' : ''}
    <div class="kv"><span>Cost per night</span><b>${money(D.portfolio.find((q) => q.id === nd.type).costNight)} vs ${money(D.costs.alcDay)} in acute</b></div>
    ${actionBtn(x.key, 'Send referral for sign-off', `Referral sent to ${nd.name}`)}</div>`;
}
function actionBtn(key, label, done) {
  return S.sent[key] ? `<div style="margin-top:12px"><span class="pill good">✓ ${esc(done)}</span></div>`
    : `<button class="btn primary" style="margin-top:12px;width:100%" onclick="sendFor('${key}','${esc(done).replace(/'/g, '&#39;')}')">${esc(label)}</button>`;
}
function sendFor(key, msg) { S.sent[key] = true; render(); toast(msg + ' · bed released when accepted'); }

function hahHTML(p) {
  const st = S.pkg.margaret || 'none';
  const items = p.package.map((it, i) => `<div id="pk${i}" class="${st === 'ready' || st === 'sent' ? 'done' : ''}">${st === 'ready' || st === 'sent' ? '✓' : '○'} ${esc(it)}</div>`).join('');
  return `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)">
    <div><div class="eyebrow">Hospital at Home eligibility</div>
      ${p.criteria.map(([c, ok]) => `<div class="fit" style="grid-template-columns:22px 1fr"><span class="x ${ok ? 'yes' : 'no'}">${ok ? '✓' : '✕'}</span><span>${esc(c)}</span></div>`).join('')}
      <div class="srcnote" ${tip('Signal 1 model output joined to Hospital at Home program criteria.', 'signal1.deterioration · hah.criteria')}>Screened tonight with ${n0(R.hah.screened)} other inpatients. ${R.hah.eligible.length} were eligible.</div></div>
    <div><div class="eyebrow">Transition package <small style="text-transform:none;letter-spacing:0;font-weight:400;color:var(--muted)">assembled from the chart, editable before sending</small></div>
      <div class="pkg">${items}</div>
      <div style="display:flex;gap:10px;margin-top:12px">
        ${st === 'none' ? `<button class="btn primary" onclick="buildPackage()">Assemble package</button>` : ''}
        ${st === 'building' ? `<button class="btn" disabled>Assembling…</button>` : ''}
        ${st === 'ready' ? `<button class="btn primary" onclick="sendHah()">Send to Hospital at Home</button><span class="srcnote" style="margin:auto 0">About 40 minutes of chart work, done in seconds.</span>` : ''}
        ${st === 'sent' ? `<span class="pill good">✓ Accepted by Hospital at Home · VGH 6 East bed released</span>` : ''}
      </div></div></div>`;
}
function buildPackage() {
  S.pkg.margaret = 'building'; render();
  const n = D.personas.margaret.package.length; let i = 0;
  const tick = () => {
    const el = $('pk' + i); if (el) { el.className = 'done'; el.textContent = '✓ ' + D.personas.margaret.package[i]; }
    i++; if (i < n) setTimeout(tick, reduced() ? 10 : 330); else { S.pkg.margaret = 'ready'; setTimeout(render, 250); }
  };
  setTimeout(tick, 200);
}
function sendHah() { S.pkg.margaret = 'sent'; render(); toast('Hospital at Home accepted Margaret. Medly enrolment and monitoring kit ordered.'); }

// ---------- scene 4: the next beds ----------
function scene4() {
  ensureRun();
  const C = R.abi;
  const m = Engine.abiModel({ A: S.sl.A, B: S.sl.B, C: S.sl.C }, S.sl.occ);
  const opt = (o) => `<div class="opt"><div class="eyebrow" style="margin:0">Option ${o.id}</div><div class="on">${esc(o.name)}</div><div class="os">${esc(o.sub)}</div>
    <div class="kv"><span>Cost per night</span><b ${tip('Illustrative unit cost.', 'finance.unit_costs (illustrative)')}>${money(o.costNight)}</b></div>
    <div class="kv"><span>Fits</span><b>${o.fits} of ${C.n} people</b></div>
    <div class="kv"><span>Ready in</span><b>${o.lead}</b></div>
    <div class="kv"><span>One-time capital</span><b>${o.capex ? moneyM(o.capex) : '–'}</b></div>
    <div class="slider"><label for="sl${o.id}" class="srcnote" style="margin:0">Beds</label><input type="range" id="sl${o.id}" min="0" max="${o.maxBeds}" value="${S.sl[o.id]}" oninput="setSl('${o.id}',this.value)"><output id="o${o.id}">${S.sl[o.id]}</output></div></div>`;
  const sq = `<div class="opt sq"><div class="eyebrow" style="margin:0;color:var(--coral)">Today</div><div class="on">Stay in acute care</div><div class="os">Deconditioning, boarded emergency patients, no plan</div>
    <div class="kv"><span>Cost per night</span><b ${tip('Conservative ALC bed-day cost (Sutherland et al. 2019).', 'costs.alc_day')}>${money(D.costs.alcDay)}</b></div>
    <div class="kv"><span>Fits</span><b>none</b></div><div class="kv"><span>Ready in</span><b>–</b></div><div class="kv"><span>Acute bed-days a year</span><b>${n0(C.bedDaysYr)}</b></div></div>`;
  return headHTML('Decision engine · options analysis', 'What should the next beds be?',
    `${C.n} people with a brain injury and neuropsychiatric needs are waiting in acute care across ${C.sites} sites. Nothing in VCH’s portfolio fits them. The engine compares ways to create the capacity they need.`,
    `<span class="pill warn" style="align-self:flex-start">Draft · sign-off required</span>`)
    + `<div class="tiles">
      <div class="tile"><div class="lab">People in this cohort</div><div class="big">${C.n}</div><div class="sub">across ${C.sites} acute sites</div></div>
      <div class="tile"><div class="lab">Average time ready to leave</div><div class="big">${Math.round(C.avgDays)} days</div><div class="sub">and counting</div></div>
      <div class="tile alert"><div class="lab">Acute bed-days held a year</div><div class="big">${n0(C.bedDaysYr)}</div><div class="sub">if nothing changes</div></div>
      <div class="tile"><div class="lab">Acute capacity they hold</div><div class="big">${moneyM(C.valueYr)}</div><div class="sub">a year, at $1,090 per day</div></div></div>
    <div class="opts">${D.abiOptions.map(opt).join('')}${sq}</div>
    <div class="grid" style="grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);margin-top:14px">
      <div class="card"><h3>Effect of this portfolio <small>median and 80% range</small></h3>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><label for="slOcc" class="srcnote" style="margin:0">Expected occupancy</label>
          <input type="range" id="slOcc" min="0.7" max="0.98" step="0.01" value="${S.sl.occ}" oninput="setSl('occ',this.value)" style="width:160px">
          <output id="oOcc" class="num" style="font-weight:700;color:var(--amber)">${Math.round(S.sl.occ * 100)}%</output></div>
        <div id="resCard">${resultsHTML(m)}</div></div>
      <div class="card"><h3>Draft for the executive <small>written by the engine from the model above</small></h3><div class="memo" id="memo">${memoHTML(m)}</div>
        <button class="btn" onclick="copyMemo()" style="margin-top:6px">Copy memo text</button></div></div>`;
}
function rangeBar(lo, mid, hi, max) {
  const p = (v) => Math.max(0, Math.min(100, v / max * 100));
  return `<div class="range"><span style="left:${p(lo)}%;width:${(p(hi) - p(lo)).toFixed(1)}%"></span><i style="left:calc(${p(mid)}% - 1px)"></i></div>`;
}
function resultsHTML(m) {
  return `<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px"><span class="pill ocean">${m.totalBeds} new places</span><span class="pill ${m.placed >= R.abi.n ? 'good' : 'warn'}">places ${m.placed} of ${R.abi.n} people</span></div>
    <div class="res">
      <div class="metric"><div class="lab">Acute bed-days released a year</div><div class="v">${n0(m.bedDays)}</div>${rangeBar(m.bd10, m.bedDays, m.bd90, Math.max(8400, m.bd90))}<div class="r">${n0(m.bd10)} to ${n0(m.bd90)}</div></div>
      <div class="metric"><div class="lab">Room for more admissions a year</div><div class="v">${n0(m.admissions)}</div><div class="r" ${tip('Bed-days released ÷ 8.1-day average stay (C.D. Howe Institute).', 'costs.avg_los')}>at an 8.1-day average stay</div></div>
      <div class="metric"><div class="lab">Blended cost per night</div><div class="v">${m.totalBeds ? money(m.costPerNight) : '–'}</div><div class="r">vs ${money(D.costs.alcDay)} in acute care</div></div>
      <div class="metric"><div class="lab">Cost to run a year</div><div class="v">${moneyM(m.opexYr)}</div><div class="r">plus ${m.capex ? moneyM(m.capex) + ' one-time capital' : 'no capital'}</div></div>
      <div class="metric"><div class="lab">Acute capacity released, value a year</div><div class="v">${moneyM(m.value)}</div><div class="r">at $1,090 per ALC day</div></div>
      <div class="metric"><div class="lab">Net capacity value a year</div><div class="v" style="color:${m.net >= 0 ? 'var(--sage)' : 'var(--coral)'}">${moneyM(m.net)}</div>${rangeBar(Math.max(0, m.net10), Math.max(0, m.net), Math.max(0, m.net90), Math.max(5e6, m.net90))}<div class="r">${moneyM(m.net10)} to ${moneyM(m.net90)}</div></div>
    </div>
    <div class="srcnote">Ranges come from 800 simulations varying occupancy, placement breakdown (up to 15%) and operating cost (±16%). Unit costs are illustrative until CHORDS completes VCH’s cost-per-bed work. Released capacity refills with other patients; it is not a cash saving.</div>`;
}
function memoParts(m) {
  if (!m.totalBeds) return null;
  const parts = [];
  const mix = [];
  if (S.sl.B) mix.push(`${S.sl.B} in a VCH-run small complex-care home`);
  if (S.sl.A) mix.push(`${S.sl.A} contracted secured beds`);
  if (S.sl.C) mix.push(`${S.sl.C} enhanced supported-housing units`);
  parts.push(['Recommendation', `For the ${R.abi.n} people with a brain injury and neuropsychiatric needs now waiting in acute care, create ${m.totalBeds} places: ${mix.join(', ')}. This places ${m.placed} of ${R.abi.n} people.`]);
  parts.push(['Effect on acute care', `About ${n0(m.bedDays)} acute bed-days released a year (80% range ${n0(m.bd10)} to ${n0(m.bd90)}), room for about ${n0(m.admissions)} more admissions, worth ${moneyM(m.value)} a year at a conservative $1,090 per ALC day.¹`]);
  parts.push(['Cost', `${moneyM(m.opexYr)} a year to operate, a blended ${money(m.costPerNight)} per bed-night against $1,090 in acute care.²${m.capex ? ` One-time capital of ${moneyM(m.capex)} for the home.³` : ''} Net capacity value ${moneyM(m.net)} a year (80% range ${moneyM(m.net10)} to ${moneyM(m.net90)}).`]);
  parts.push(['Caveats', 'Unit costs are illustrative until CHORDS completes VCH’s cost-per-bed work. Ranges reflect occupancy, placement breakdown and operating cost. Draft for discussion; requires sign-off.']);
  return parts;
}
function memoHTML(m) {
  const parts = memoParts(m);
  if (!parts) return '<p>Set at least one option above zero to see its effect.</p>';
  const sup = { '¹': tip('Sutherland et al. 2019 estimate, 2016 dollars. Conservative.', 'costs.alc_day'), '²': tip('Illustrative unit costs by bed type.', 'finance.unit_costs'), '³': tip('Purchase and retrofit of a residential property. Illustrative.', 'capital.estimate') };
  return parts.map(([h, t]) => `<p><b>${h}.</b> ${esc(t).replace(/[¹²³]/g, (c) => `<sup ${sup[c]}>${c === '¹' ? 1 : c === '²' ? 2 : 3}</sup>`)}</p>`).join('');
}
function setSl(k, v) {
  S.sl[k] = k === 'occ' ? +v : Math.round(+v);
  const m = Engine.abiModel({ A: S.sl.A, B: S.sl.B, C: S.sl.C }, S.sl.occ);
  if (k !== 'occ') { const o = $('o' + k); if (o) o.textContent = S.sl[k]; } else { const o = $('oOcc'); if (o) o.textContent = Math.round(S.sl.occ * 100) + '%'; }
  const rc = $('resCard'), memo = $('memo');
  if (rc) rc.innerHTML = S.mode === 'ops' ? opsResultsHTML(m) : resultsHTML(m);
  if (memo) memo.innerHTML = memoHTML(m);
}
function copyMemo() {
  const parts = memoParts(Engine.abiModel({ A: S.sl.A, B: S.sl.B, C: S.sl.C }, S.sl.occ));
  const text = parts ? parts.map(([h, t]) => `${h}. ${t.replace(/[¹²³]/g, '')}`).join('\n\n') : '';
  try { navigator.clipboard.writeText(text).then(() => toast('Memo text copied'), () => toast('Copy was blocked by the browser')); } catch (e) { toast('Copy was blocked by the browser'); }
}

// ---------- scene 5: the gift ----------
function scene5() {
  const wins = [
    ['w1', 'Signal 1, unlocked', `The engine screening ${n0(R.hah.screened)} inpatients for Hospital at Home with Signal 1.`,
      'An automated, governed feed in place of today’s manual file transfers. VCH already holds the contract; the feed makes Signal 1 its platform for AI across the organization.',
      ['Feed live, Month 9']],
    ['w2', 'Five chronic-disease apps', `Medly on Margaret’s discharge, and ${R.cdm.n} people leaving today who could be followed on it.`,
      'Medly in a VCH heart-failure clinic, then four more apps with UHN’s Centre for Digital Therapeutics, chosen by their burden of emergency visits and readmissions.',
      ['Medly, Month 9', 'Three apps, Month 18', 'Five, Year 3 (Tier 2)']],
    ['w3', 'The command centre', 'Tonight’s picture of every bed, the engine, and the question of what the next beds should be.',
      'A weekly cost-of-ALC report for every acute site and the first business case to the executive, then the live community-bed board and a Hospital at Home eligibility finder.',
      ['Report and business case, Month 6', 'Board, Month 12']],
  ];
  const name = S.donor ? esc(S.donor) : '[your name]';
  return headHTML('The gift', 'Three early wins, then a command centre that lasts', 'What you have just seen, what the gift builds from it, and when.')
    + `<div class="wins">${wins.map(([c, t, demo, builds, when], i) => `<div class="card win ${c}"><div class="wl">Early win ${i + 1}</div><h2>${t}</h2>
        <dl><div><dt>In this demo</dt><dd>${esc(demo)}</dd></div><div><dt>What the gift builds</dt><dd>${esc(builds)}</dd></div></dl>
        <div class="when">${when.map((w) => `<span>${w}</span>`).join('')}</div></div>`).join('')}</div>
    <div class="gift">
      <div class="card"><h3>By Year 5</h3><table class="figs"><tbody>
        <tr><td>−20%</td><td>ALC days for people waiting for a community bed</td></tr>
        <tr><td>≥95%</td><td>of VCH-funded community beds visible, with daily occupancy and unit cost</td></tr>
        <tr><td>3 to 5</td><td>chronic-disease apps in VCH clinics, starting with ≥250 patients on Medly</td></tr>
        <tr><td>≥8</td><td>decision-engine analyses that changed a budget</td></tr></tbody></table>
        <div class="srcnote">Today this is a prototype on illustrative data. Privacy impact assessments, the SFU data-sharing agreement and VCH’s Signal 1 contract are already in place.</div></div>
      <div class="card"><h3>Already built</h3><table class="figs"><tbody>
        <tr><td>8</td><td>VCH–SFU Embedded Research Program projects</td></tr>
        <tr><td>42</td><td>team members, 25 of them VCH staff</td></tr>
        <tr><td>$500K</td><td>already invested by the VGH &amp; UBC Hospital Foundation</td></tr>
        <tr><td>1</td><td>working model of VCH’s supported-housing system, now redesigning placements</td></tr></tbody></table></div>
    </div>
    <div class="endcard">
      <div><div class="eyebrow">Naming opportunity</div><div class="nm">The <i>${name}</i> Command Centre</div>
        <p class="by">Built and run by CHORDS within C2E2 at the VCH Research Institute</p>
        <p>It sees every bed VCH funds, works out where each person should go, and makes the case for what to build next. CHORDS is the Centre for Health Operations Research and Decision Science. VCH sustains the team from Year 6.</p></div>
      <div><div class="tier"><div class="a">$5.0M</div><div class="d">Tier 1, over five years. The three early wins: Signal 1 unlocked, Medly and two more chronic-disease apps, and the command centre, with the CHORDS team that builds them.</div></div>
        <div class="tier"><div class="a">$10.0M</div><div class="d">Tier 2, over five years. Everything in Tier 1, plus all five chronic-disease apps, enterprise AI on Signal 1, postdoctoral fellows, an operations room, a staff modelling academy and spread to a second organization.</div></div></div>
    </div>`;
}

// ---------- settings, notes, toast, tooltip ----------
function settingsHTML() {
  return `<div class="modal-bg" onclick="if(event.target===this)closeSettings()"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="setT">
    <h2 id="setT">Demo settings</h2>
    <label for="donorIn">Donor name (names the command centre in the top bar and the closing scene)</label>
    <input type="text" id="donorIn" value="${esc(S.donor)}" placeholder="e.g. Smith Family">
    <label for="notesIn"><input type="checkbox" id="notesIn" ${S.notes ? 'checked' : ''}> Show presenter notes (press N)</label>
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn primary" onclick="saveSettings()">Save</button>
      <button class="btn" onclick="replayEngine()">Replay the engine</button>
      <button class="btn" onclick="resetDemo(S.mode === 'ops')">Reset demo</button>
      <button class="btn" onclick="closeSettings()" style="margin-left:auto">Close</button></div>
    <p class="srcnote">Live board keys: 1–5 tabs · ← → next tab · H huddle · T guided tour · N notes · Esc close.<br>Guided tour keys: ← → scenes · 1–5 jump · R run the engine · L live board.</p></div></div>`;
}
function openSettings() { S.settings = true; render(); const i = $('donorIn'); if (i) i.focus(); }
function closeSettings() { S.settings = false; render(); }
function saveSettings() { S.donor = $('donorIn').value.trim().slice(0, 60); S.notes = $('notesIn').checked; store.set('donor', S.donor); store.set('notes', S.notes); S.settings = false; render(); }
function toggleNotes() { S.notes = !S.notes; store.set('notes', S.notes); render(); }
function replayEngine() { clearTimeout(runTimer); S.run = 'idle'; S.feed = []; S.released = 0; S.shown = { lines: false, hah: false, srm: false, opps: [] }; S.settings = false; go(2); render(); }
// resetDemo() returns to scene 1 of the guided tour, as the web presentation expects; resetDemo(true) resets in place
function resetDemo(stay) {
  clearTimeout(runTimer);
  Object.assign(S, { run: 'idle', feed: [], released: 0, shown: { lines: false, hah: false, srm: false, opps: [] }, selected: 'margaret', pkg: {}, sent: {}, sl: { A: 6, B: 10, C: 6, occ: 0.9 }, settings: false, huddle: null, peek: null });
  Live.init();
  if (stay !== true) go(1);
  render();
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.innerHTML = `<i></i>${esc(msg)}`;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3400);
}
function afterRender() { document.title = (S.donor ? `The ${S.donor} Command Centre` : 'The Command Centre') + ' · CHORDS at C2E2'; }

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest ? e.target.closest('[data-tip]') : null; const tt = $('tooltip');
  if (!el) { tt.style.display = 'none'; return; }
  tt.innerHTML = esc(el.getAttribute('data-tip')) + (el.getAttribute('data-src') ? `<div class="s">source: ${esc(el.getAttribute('data-src'))}</div>` : '');
  tt.style.display = 'block';
});
document.addEventListener('mousemove', (e) => {
  const tt = $('tooltip'); if (tt.style.display !== 'block') return;
  const x = Math.min(e.clientX + 14, window.innerWidth - 340), y = Math.min(e.clientY + 14, window.innerHeight - 90);
  tt.style.left = x + 'px'; tt.style.top = y + 'px';
});
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.type !== 'range') { if (e.key === 'Escape') closeSettings(); return; }
  if (S.settings) { if (e.key === 'Escape') closeSettings(); return; }
  const k = e.key, fwd = k === 'ArrowRight' || k === 'PageDown', back = k === 'ArrowLeft' || k === 'PageUp';
  if (k === 'n' || k === 'N') return toggleNotes();
  if (S.mode === 'tour') {
    if (fwd) go(S.scene + 1);
    else if (back) go(S.scene - 1);
    else if (/^[1-5]$/.test(k)) go(+k);
    else if ((k === 'r' || k === 'R') && S.scene === 2) runEngine();
    else if (k === 'l' || k === 'L' || k === 'Escape') setTab(S.tab);
    return;
  }
  const i = TABS.findIndex((t) => t.id === S.tab);
  if (k === 'Escape') { if (S.peek) closePeek(); else if (S.huddle !== null) huddle(null); }
  else if (S.huddle !== null && (fwd || back)) { if (fwd) huddleStep(1); else if (S.huddle > 0) huddleStep(-1); }
  else if (fwd) setTab(TABS[(i + 1) % TABS.length].id);
  else if (back) setTab(TABS[(i + TABS.length - 1) % TABS.length].id);
  else if (/^[1-5]$/.test(k)) setTab(TABS[+k - 1].id);
  else if (k === 'h' || k === 'H') huddle(S.huddle === null ? 0 : null);
  else if (k === 't' || k === 'T') go(S.scene);
  else if ((k === 'r' || k === 'R') && S.tab === 'engine') runEngine();
});

