/* ============================================================
   Operations view: the wall. One 16:9 canvas (1600 × 900, scaled
   to the screen), a persistent status bar, and one board per
   function of the centre. Selectors first (every figure is
   computed from DATA and the live state), then the shell and
   the Flow board. The other boards are in ops_boards.js.
   ============================================================ */
const Ops = (() => {
  const T = DATA.thresholds;
  const ORDER = { g: 0, a: 1, r: 2 };
  const rag = (v, th) => (v >= th.red ? 'r' : v >= th.amber ? 'a' : 'g');
  const worst = (list) => list.reduce((a, b) => (ORDER[b] > ORDER[a] ? b : a), 'g');
  const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
  const NEED_TYPE = { ltc: 'ltc', ltcs: 'ltcs', al: 'al', sh: 'sh', home: 'hhs', complex: 'cch' };

  // one acute site against its thresholds
  function siteStat(s, now) {
    const L = Live.L, occN = L.occ[s.id], alcN = Live.alc().filter((p) => p.site === s.id).length;
    const q = L.ed.filter((x) => x.site === s.id);
    const longest = q.length ? Math.min(...q.map((x) => x.t0)) : null;
    const waitMin = longest ? (now - longest) / MIN : 0;
    const occPct = occN / s.beds, alcShare = alcN / occN;
    const st = { occ: rag(occPct, T.occ), alc: rag(alcShare, T.alcSite), ed: rag(waitMin, T.edWait) };
    const state = worst(Object.values(st));
    const bits = [];
    if (st.occ === state) bits.push(`occupancy ${(occPct * 100).toFixed(0)}%`);
    if (st.alc === state) bits.push(`ALC ${(alcShare * 100).toFixed(0)}% of occupied beds`);
    if (st.ed === state && longest) bits.push(`longest emergency wait ${fmtHM(now - longest)}`);
    return { ...s, occN, occPct, alcN, alcShare, edN: q.length, longest, st, state, why: state === 'g' ? 'all measures inside thresholds' : bits.join(', ') };
  }

  // the whole system
  function sys(now) {
    const L = Live.L, alc = Live.alc();
    const occ = sum(DATA.sites, (s) => L.occ[s.id]), beds = sum(DATA.sites, (s) => s.beds);
    const edOver = L.ed.filter((q) => (now - q.t0) / MIN >= T.edWait.red).length;
    const waits = L.ed.map((q) => now - q.t0).sort((a, b) => a - b);
    const hahCap = DATA.portfolio.find((p) => p.id === 'hah').places, srm = DATA.portfolio.find((p) => p.id === 'srm');
    const occPct = occ / beds;
    const surge = [...DATA.surge].reverse().find((r) => occPct >= r.occ || L.ed.length >= r.ed);
    const acts = actions();
    const bedActs = acts.filter((a) => a.beds);
    return {
      occ, beds, occPct, alc: alc.length, alcShare: alc.length / occ, ed: L.ed.length, edOver,
      edLongest: L.ed.length ? Math.min(...L.ed.map((q) => q.t0)) : null, edMedian: waits.length ? waits[Math.floor(waits.length / 2)] : 0,
      open: sum(DATA.nodes, nodeOpen), places: sum(DATA.portfolio.filter((p) => !p.virtual), (p) => p.places),
      hah: L.hah.length, hahCap, srm: srm.places - srm.open + L.srmExtra, srmCap: srm.places,
      surge, drafted: bedActs.length, signed: bedActs.filter((a) => status(a) !== 'awaiting' && status(a) !== 'ready').length,
      released: bedActs.filter((a) => status(a) === 'done').length, awaiting: acts.filter((a) => ['awaiting', 'ready'].includes(status(a))).length,
      redSites: DATA.sites.filter((s) => siteStat(s, now).state === 'r').length,
    };
  }

  // every action the engine has drafted, with its owner. Built once from the engine's results.
  let ACT = null;
  function actions() {
    if (ACT) return ACT;
    const PL = personList();
    const inTour = new Set([...PL.go, ...PL.none].map((x) => x.key));
    const O = DATA.owners, A = [];
    R.hah.eligible.forEach((p) => { const key = p.persona || p.id;
      A.push({ key, kind: 'hah', p, title: `${p.name} to Hospital at Home`, dest: 'Hospital at Home', owner: O.hah(), tab: 'home', beds: 1, person: true, auto: !inTour.has(key) }); });
    R.matches.forEach((m) => { const p = m.patient, key = p.persona || p.id;
      A.push({ key, kind: 'place', p, node: m.node, km: m.km, title: `${p.name} to ${m.node.name}`, dest: m.node.name, owner: O.place(site(p.site)), tab: 'beds', beds: 1, person: true, auto: !inTour.has(key),
        dueT: Live.L.born + (DATA.schedule.vacancyHoldHours - m.node.openHours) * HOUR }); });
    R.srm.forEach((p) => A.push({ key: p.id, kind: 'srm', p, title: `${p.name} home with remote monitoring`, dest: 'Seniors Remote Monitoring', owner: O.srm(site(p.site)), tab: 'home', beds: 1, person: true, auto: !inTour.has(p.id) }));
    R.cdm.people.forEach((p) => A.push({ key: 'medly:' + (p.persona || p.id), kind: 'cdm', p, title: `Enrol ${p.name} on Medly at discharge`, dest: 'Medly', owner: O.cdm(), tab: 'cdm', beds: 0, auto: !p.persona }));
    A.push({ key: 'abi', kind: 'analysis', title: `Options analysis: ${R.abi.n} people with a brain injury and no setting`, owner: O.analysis(), tab: 'engine', beds: 0 });
    R.contracts.rows.forEach((c, i) => A.push({ key: 'contract:' + i, kind: 'contract', title: `Renegotiation brief: ${c.name.replace(/ \(.*/, '')}, ${c.empty} empty units`, owner: O.contract(), tab: 'beds', beds: 0 }));
    A.push({ key: 'mismatch', kind: 'review', title: `Review ${R.mismatches.stepUp + R.mismatches.stepDown} residents in the wrong level of support`, owner: O.review(), tab: 'beds', beds: 0 });
    // personas lead, then the analysis, then bed moves by length of wait, then everything else
    const rank = (a) => (a.p && a.p.persona && a.beds ? 0 : a.kind === 'analysis' ? 1 : a.kind === 'place' ? 2 : a.kind === 'hah' ? 3 : a.kind === 'srm' ? 4 : a.kind === 'cdm' ? 5 : 6);
    ACT = A.map((a, i) => ({ a, i })).sort((x, y) => rank(x.a) - rank(y.a) || (x.a.kind === 'place' ? y.a.p.days - x.a.p.days : 0) || x.i - y.i).map((x) => x.a);
    return ACT;
  }
  function status(a) {
    if (a.key === 'margaret') return S.pkg.margaret === 'sent' ? 'done' : S.pkg.margaret === 'ready' ? 'ready' : 'awaiting';
    if (Live.L.accepted[a.key]) return 'done';
    if (S.sent[a.key]) return a.beds ? 'signed' : 'done';
    return 'awaiting';
  }
  const RANK = { ready: 0, awaiting: 1, signed: 2, done: 3 };
  const sorted = () => actions().map((a, i) => ({ a, i, s: status(a) })).sort((x, y) => RANK[x.s] - RANK[y.s] || x.i - y.i).map((x) => x.a);
  const byKey = (key) => actions().find((a) => a.key === key);
  const protectedIds = () => new Set(actions().filter((a) => a.p).map((a) => a.p.id));
  // a place stops being open once an offer for it is signed
  const nodeOpen = (n) => n.open - actions().filter((a) => a.node === n && status(a) !== 'awaiting').length;

  // where the people waiting need to go, against what the portfolio has open
  function demand() {
    const by = {};
    Live.alc().forEach((p) => { by[p.need] = (by[p.need] || 0) + 1; });
    const rows = DATA.portfolio.filter((p) => !p.virtual).map((p) => {
      const need = Object.keys(NEED_TYPE).find((k) => NEED_TYPE[k] === p.id);
      const open = sum(DATA.nodes.filter((n) => n.type === p.id), nodeOpen);
      return { ...p, need, waiting: by[need] || 0, openNow: open, occupied: p.places - open };
    });
    return { rows, none: [['abi', by.abi || 0], ['other', by.other || 0]] };
  }

  // Hospital at Home: visits follow each person's daily schedule
  function hah(now) {
    const L = Live.L, mins = (now - Live.dayStart(now)) / MIN;
    const rows = L.hah.map((p) => {
      const next = p.visits.find((v) => v > mins);
      return { ...p, state: rag(p.news, T.news), done: p.visits.filter((v) => v <= mins).length, nextT: Live.dayStart(now) + (next !== undefined ? next : p.visits[0] + 1440) * MIN, tomorrow: next === undefined };
    }).sort((a, b) => ORDER[b.state] - ORDER[a.state] || b.news - a.news || a.nextT - b.nextT);
    return { rows, cap: DATA.portfolio.find((p) => p.id === 'hah').places, visitsDone: sum(rows, (r) => r.done), visitsPlanned: sum(rows, (r) => r.visits.length),
      review: rows.filter((r) => r.state === 'r').length, watch: rows.filter((r) => r.state === 'a').length };
  }

  // alerts for one app: today's list, the open queue, counts
  function alerts(app, now) {
    const L = Live.L, list = app === 'medly' ? L.medlyAlerts : L.srmAlerts, from = Live.todayStart(now);
    const today = list.filter((a) => a.t >= from);
    const sev = { red: 0, amber: 1 };
    const open = today.filter((a) => a.status === 'new' || a.status === 'review').sort((x, y) => (x.status === 'new' ? 0 : 1) - (y.status === 'new' ? 0 : 1) || sev[x.sev] - sev[y.sev] || x.t - y.t);
    const closed = today.filter((a) => a.status === 'resolved' || a.status === 'escalated').sort((x, y) => y.doneT - x.doneT);
    const resp = today.filter((a) => a.ackT).map((a) => a.ackT - a.t).sort((x, y) => x - y);
    return { today, open, closed, fresh: open.filter((a) => a.status === 'new').length, escalated: today.filter((a) => a.status === 'escalated').length,
      medianResp: resp.length ? resp[Math.floor(resp.length / 2)] : 0, oldest: open.filter((a) => a.status === 'new').reduce((m, a) => Math.min(m, a.t), Infinity) };
  }
  function srm(now) {
    const p = DATA.portfolio.find((x) => x.id === 'srm'), enrolled = p.places - p.open + Live.L.srmExtra;
    const frac = (now - Live.dayStart(now)) / DAY, expected = Math.round(enrolled * DATA.srm.readingsPerDay * frac);
    return { enrolled, cap: p.places, free: p.places - enrolled, expected, received: Math.round(expected * DATA.srm.adherence), ...alerts('srm', now) };
  }
  function medly(now) {
    const app = DATA.cdm.apps[0], enrolled = DATA.medlyPanel.length + Live.L.medlyExtra, cap = app.nurses * DATA.cdm.nurseRatio;
    return { app, enrolled, cap, load: enrolled / cap, state: rag(enrolled / cap, T.caseload), headroom: cap - enrolled, perNurse: Math.round(enrolled / app.nurses), ...alerts('medly', now) };
  }
  // how many people in acute care now live with each candidate condition
  function burden(cond) {
    const alc = Live.alc().filter((p) => (p.conds || []).includes(cond));
    return { n: alc.length + DATA.inpatients.filter((p) => (p.conds || []).includes(cond)).length, days: sum(alc, (p) => p.days) };
  }
  const returns = (now) => { const late = DATA.nodes.filter((n) => now - Live.L.returns[n.id] > DAY); return { late, n: DATA.nodes.length - late.length, of: DATA.nodes.length }; };
  const reset = () => { ACT = null; };

  return { rag, worst, siteStat, sys, actions, status, sorted, byKey, protectedIds, nodeOpen, demand, hah, alerts, srm, medly, burden, returns, reset, NEED_TYPE };
})();

// ---------- shared pieces ----------
const TABS = [
  { id: 'flow', label: 'Flow', sub: 'acute and ALC' },
  { id: 'beds', label: 'Community beds' },
  { id: 'home', label: 'Home', sub: 'Hospital at Home and remote monitoring' },
  { id: 'cdm', label: 'CDM apps', sub: 'chronic-disease management' },
  { id: 'engine', label: 'Decision engine' },
];
const RAGCOL = { g: PAL.sage, a: PAL.amber, r: PAL.coral };
const NEED_SHORT = { ltc: 'Long-term care', ltcs: 'Secured LTC', al: 'Assisted living', sh: 'Supported housing', home: 'Home with supports', abi: 'Brain injury', complex: 'Complex care', other: 'Specialized', hah: 'Hospital at Home' };
const pc = (v, d = 0) => (v * 100).toFixed(d) + '%';

function fmtTimer(f, t0, now) {
  if (f === 'clock') return clock(now, true);
  const s = Math.max(0, Math.floor((f === 'down' || f === 'dms' ? t0 - now : now - t0) / 1000));
  if (f === 'hms' || f === 'down') return `${pad2(s / 3600)}:${pad2(s % 3600 / 60)}:${pad2(s % 60)}`;
  if (f === 'ms' || f === 'dms') return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
  if (f === 'dh') return `${Math.floor(s / 86400)} d ${pad2(s % 86400 / 3600)} h`;
  return s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h ${pad2(s % 3600 / 60)} min`;
}
// a running timer: the text updates every second; data-a / data-r are the amber and red thresholds in ms
function tmr(t0, f, o = {}) {
  const now = Date.now(), d = now - t0;
  const cls = o.r && d >= o.r ? ' t-r' : o.a && d >= o.a ? ' t-a' : '';
  return `<span class="tmr num${cls}" data-t0="${Math.round(t0)}" data-f="${f}"${o.a ? ` data-a="${o.a}"` : ''}${o.r ? ` data-r="${o.r}"` : ''}>${fmtTimer(f, t0, now)}</span>`;
}
function updateTimers(now = Date.now()) {
  document.querySelectorAll('.tmr').forEach((el) => {
    const t0 = +el.dataset.t0, txt = fmtTimer(el.dataset.f, t0, now);
    if (el.textContent !== txt) el.textContent = txt;
    const a = +el.dataset.a || 0, r = +el.dataset.r || 0, d = now - t0;
    if (a || r) { el.classList.toggle('t-r', !!r && d >= r); el.classList.toggle('t-a', !!a && d >= a && !(r && d >= r)); }
  });
}
function spark(arr, w = 84, h = 26, col = PAL.blue) {
  const lo = Math.min(...arr), hi = Math.max(...arr), span = hi - lo || 1;
  const pts = arr.map((v, i) => [(i / (arr.length - 1)) * (w - 5) + 2, h - 3 - ((v - lo) / span) * (h - 7)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const e = pts[pts.length - 1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d} L${e[0].toFixed(1)} ${h} L2 ${h} Z" fill="${col}" opacity=".13"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="2.4" fill="${col}"/></svg>`;
}
// a bar with its thresholds marked on it
function tbar(v, lo, hi, ticks, state) {
  const p = (x) => clamp((x - lo) / (hi - lo) * 100, 0, 100);
  return `<div class="tbar"><span class="f-${state}" style="width:${p(v).toFixed(1)}%"></span>${ticks.map((t) => `<i style="left:${p(t).toFixed(1)}%"></i>`).join('')}</div>`;
}
const panelH = (title, small = '', right = '') => `<div class="oh"><h3>${title}${small ? ` <small>${small}</small>` : ''}</h3>${right ? `<div class="ohr">${right}</div>` : ''}</div>`;
const statusPill = (a) => { const st = Ops.status(a);
  return { awaiting: '<span class="pill warn">Awaiting sign-off</span>', ready: '<span class="pill warn">Package ready to send</span>', signed: '<span class="pill ocean">Signed · with operator</span>',
    done: `<span class="pill good">✓ ${a.beds ? 'Accepted · bed released' : a.kind === 'cdm' ? 'Enrolled' : 'Signed'}</span>` }[st]; };
// slim: the row itself opens the person, so only the sign-off button is shown
function actButtons(a, slim) {
  const st = Ops.status(a);
  if (st !== 'awaiting' && st !== 'ready') return '';
  const review = a.key === 'margaret' ? `<button class="obtn pri" onclick="event.stopPropagation();peek('margaret')">Open</button>`
    : a.person && !slim ? `<button class="obtn" onclick="peek('${a.key}')">Review</button>` : a.kind === 'analysis' && !slim ? `<button class="obtn" onclick="setTab('engine')">Open</button>` : '';
  return review + (a.key === 'margaret' ? '' : `<button class="obtn pri" onclick="event.stopPropagation();signOff('${a.key}')">Sign off</button>`);
}
// a two-line row: what it is and its status, then the detail and what you can do
const row2 = (cls, title, status, sub, btns, click = '') => `<div class="r2 ${cls}"${click ? ` onclick="${click}"` : ''}><div class="a1"><div class="at">${title}</div>${status}</div><div class="a2"><div class="as">${sub}</div><div class="ar">${btns}</div></div></div>`;

// ---------- shell ----------
function nextHuddle(now) { const [h, m] = D.schedule.huddle; const d = new Date(now); d.setHours(h, m, 0, 0); if (d.getTime() <= now) d.setDate(d.getDate() + 1); return d.getTime(); }
function tabBadges(now) {
  const X = Ops.sys(now), H = Ops.hah(now), SR = Ops.srm(now), M = Ops.medly(now);
  return { flow: [X.redSites, 'r', 'sites over a red threshold'], beds: [X.open, 'a', 'community places open now'], home: [H.review + SR.fresh, H.review + SR.fresh ? 'r' : 'g', 'home alerts waiting for a nurse'],
    cdm: [M.fresh, M.fresh ? 'a' : 'g', 'Medly alerts waiting for a nurse'], engine: [X.awaiting, 'a', 'drafted actions awaiting sign-off'] };
}
function tabsHTML() {
  const b = tabBadges(Date.now());
  return TABS.map((t, i) => `<button class="otab${S.tab === t.id ? ' on' : ''}" onclick="setTab('${t.id}')" aria-current="${S.tab === t.id ? 'page' : 'false'}" ${tip(`${t.label}${t.sub ? ': ' + t.sub : ''} · ${b[t.id][0]} ${b[t.id][2]} · key ${i + 1}`)}>${t.label}<b class="bdg b-${b[t.id][1]}" data-k="bdg-${t.id}">${b[t.id][0]}</b></button>`).join('');
}
const SRC_SHORT = { cerner: 'Cerner ADT', s1: 'Signal 1', paris: 'PARIS', hah: 'HaH', srm: 'SRM', medly: 'Medly', operators: 'Operators', contracts: 'Contracts', finance: 'Finance' };
function statusBarHTML() {
  const now = Date.now(), X = Ops.sys(now), L = Live.L, d = new Date(now);
  const every = (s) => (s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);
  const streams = D.sources.filter((s) => s.every).map((s) => `<span class="osrc" ${tip(`${s.name}: expected every ${every(s.every)}. Shown amber when the last refresh is older than ${every(s.stale)}.`, 'feed monitor · ' + s.id)}><i></i>${SRC_SHORT[s.id]} ${tmr(L.sources[s.id], 'ms', { a: s.stale * 1000 })}</span>`).join('');
  const ret = Ops.returns(now);
  const mon = new Date(now); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const batch = `<span class="osrc ${ret.n < ret.of ? 'late' : ''}" ${tip(`Operator returns arrive once a day. ${ret.n} of ${ret.of} operators have reported in the last 24 hours.`, 'operator returns')}><i></i>Operators <b class="num" data-k="ret">${ret.n}/${ret.of}</b></span>
    <span class="osrc" ${tip('Contracts database: weekly extract.', 'contracts database')}><i></i>Contracts <b>${mon.toLocaleDateString('en-CA', { weekday: 'short', day: 'numeric' })}</b></span>
    <span class="osrc" ${tip('Finance general ledger: unit costs refresh at each month-end close.', 'finance ledger')}><i></i>Finance <b>${prev.toLocaleDateString('en-CA', { month: 'short' })} close</b></span>`;
  const rules = D.surge.slice(1).map((r) => `Level ${r.level} ${r.name}: occupancy ≥ ${pc(r.occ)} or ${r.ed}+ waiting in emergency`).join('. ');
  const slot = D.schedule.engineEveryMin * MIN;
  return `<div class="oclock"><b class="tmr num" data-f="clock" data-t0="0">${clock(now, true)}</b><span>${d.toLocaleDateString('en-CA', { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
    <div class="osurge lv${X.surge.level}" data-p="surge" ${tip(`System surge level, set by the highest rule met. Now: occupancy ${pc(X.occPct, 1)}, ${X.ed} waiting in emergency. ${rules}. Illustrative thresholds.`, 'thresholds.surge')}><b>Surge level ${X.surge.level}</b><span data-k="s-lvl">${X.surge.name}</span></div>
    <div class="osrcs"><span class="osl">Last refresh</span>${streams}${batch}</div>
    <div class="oeng" ${tip(`The decision engine re-reads every source every ${D.schedule.engineEveryMin} minutes and redrafts its actions.`, 'engine schedule')}>Engine run <b class="num">${clock(L.engineSlot * slot)}</b> · next in ${tmr((L.engineSlot + 1) * slot, 'dms')}</div>`;
}
const OPS_NOTES = {
  flow: 'This is the room the gift builds: one wall for every bed VCH funds. Read it colour first. Site tiles turn amber or red only when a threshold is crossed. The queue ranks people, not counts, and their clocks are running. The action queue shows what the engine has drafted, who owns each action and whether it is signed. Nothing moves without a person.',
  beds: 'The community side of the wall: every place VCH funds, what is open right now, and who in acute care is waiting for it. Offers are drafted by the engine and signed by a transition lead. The bottom row is the value-for-money view: contracts running under 75% and residents in the wrong level of support.',
  home: 'Two ways to care for people without an acute bed. Hospital at Home is acute care at home, so each person has an early-warning score and a visit schedule. Seniors Remote Monitoring is lighter: a kit and a nurse who triages alerts. The middle column is tonight’s pipeline: who in an acute bed could go home today.',
  cdm: 'Early win two. Medly for heart failure is live; one nurse follows up to 250 patients and triages the alerts in this queue. Four more apps follow with UHN’s Centre for Digital Therapeutics: three by Month 18, five by Year 3. The integration with Signal 1’s AI platform is a proposed design and is still to be confirmed.',
  engine: 'The engine re-reads every source every 30 minutes. Left, what it did on its last run; press Run now to watch it. Centre, what it found and every action waiting for a signature. Right, the analysis it has in draft: what the next beds should be for 23 people nothing fits.',
};
function opsShellHTML() {
  const brandName = S.donor ? `The ${esc(S.donor)} Command Centre` : 'The Command Centre';
  const now = Date.now(), hud = S.huddle !== null;
  return `<div id="wall" class="wall${hud ? ' in-huddle' : ''}">
    <header class="otop">
      <div class="brand">${logoSVG(30)}<div><div class="brand-name">${brandName}</div><div class="brand-sub">Built and run by CHORDS at C2E2, VCH Research Institute</div></div></div>
      <nav class="otabs" id="otabs" aria-label="Command centre functions">${tabsHTML()}</nav>
      <div class="top-right">
        <button class="tbtn hudbtn${hud ? ' on' : ''}" onclick="huddle(${hud ? 'null' : 0})" aria-pressed="${hud}" ${tip('Step through the daily huddle agenda on the wall. Key H.')}>${hud ? 'End huddle' : `Huddle <small class="num">${clock(nextHuddle(now))}</small>`}</button>
        <button class="tbtn" onclick="go(S.scene)" ${tip('The five-scene story for the pitch: Margaret, Joseph and Daniel. Key T.')}>Guided tour</button>
        <span class="chip-demo" ${tip('A mock-up of the board the gift builds. Patients, places, costs, alerts and events are synthetic and simulated. Acute site names are real; their numbers are illustrative.')}>Illustrative data</span>
        <button class="tbtn${S.notes ? ' on' : ''}" onclick="toggleNotes()" aria-pressed="${S.notes}">Notes</button>
        <button class="tbtn" onclick="openSettings()">Settings</button>
      </div>
    </header>
    <div class="ostat" id="ostat" data-live="status">${statusBarHTML()}</div>
    <main class="obody" id="board"${S.tab === 'engine' ? '' : ' data-live="board"'}>${boardHTML()}</main>
    ${hud ? huddleHTML() : ''}
    ${S.peek ? drawerHTML() : ''}
  </div>
  ${S.notes ? `<div class="notes" id="notesBar"><b>${hud ? 'Huddle' : TABS.find((t) => t.id === S.tab).label} ·</b><span>${esc(hud ? HUDDLE_NOTE : OPS_NOTES[S.tab])}</span></div>` : ''}
  ${S.settings ? settingsHTML() : ''}`;
}
function boardHTML() { return { flow: flowHTML, beds: bedsHTML, home: homeHTML, cdm: cdmHTML, engine: engineBoardHTML }[S.tab](); }

function renderOps() {
  document.body.classList.add('ops');
  $('app').className = 'opsapp' + (S.notes ? ' notes-on' : '');
  $('app').innerHTML = opsShellHTML();
  fitWall(); afterLive(true); afterRender();
}
// scale the 1600 × 900 wall to the window, leaving room for presenter notes
function fitWall() {
  const w = $('wall'); if (!w) return;
  const nb = $('notesBar'), nh = nb ? nb.offsetHeight : 0;
  const k = Math.min(window.innerWidth / 1600, (window.innerHeight - nh) / 900);
  w.style.transform = `scale(${k})`;
  w.style.left = Math.max(0, (window.innerWidth - 1600 * k) / 2) + 'px';
  w.style.top = Math.max(0, (window.innerHeight - nh - 900 * k) / 2) + 'px';
}
window.addEventListener('resize', fitWall);

// regions that redraw when the live state changes
const LIVE_REGIONS = { status: statusBarHTML, board: boardHTML, engQueue: () => engQueueHTML(), engFound: () => engFoundHTML() };
const seen = { vals: new Map(), event: 0 };
// never redraw under a pressed pointer: a click must land on the button it started on
const press = { down: false, pending: false };
document.addEventListener('pointerdown', () => { press.down = true; }, true);
['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, () => { press.down = false; if (press.pending) { press.pending = false; setTimeout(liveRefresh, 0); } }, true));
function liveRefresh() {
  if (S.mode !== 'ops' || !$('wall')) return;
  if (press.down) { press.pending = true; return; }
  document.querySelectorAll('[data-live]').forEach((el) => {
    const f = LIVE_REGIONS[el.dataset.live]; if (!f) return;
    if (el.dataset.live === 'engFound' && S.run === 'running') return;
    const keep = el.querySelector('.oscroll'), top = keep ? keep.scrollTop : 0;
    el.innerHTML = f();
    const again = el.querySelector('.oscroll'); if (again) again.scrollTop = top;
  });
  const tabs = $('otabs'); if (tabs) tabs.innerHTML = tabsHTML();
  afterLive(false);
}
// after any draw: flash figures that changed, slide in new feed lines, re-apply the huddle spotlight
function afterLive(full) {
  document.querySelectorAll('[data-k]').forEach((el) => {
    const k = el.dataset.k, v = el.textContent;
    if (!full && seen.vals.has(k) && seen.vals.get(k) !== v) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    seen.vals.set(k, v);
  });
  document.querySelectorAll('.frow[data-e]').forEach((el) => { if (!full && +el.dataset.e > seen.event) el.classList.add('new'); });
  seen.event = Live.L.seq;
  if (S.huddle !== null) { const h = HUDDLE[S.huddle], on = h.tab === S.tab; document.querySelectorAll('[data-p]').forEach((el) => el.classList.toggle('dim', on && !h.hl.includes(el.dataset.p))); }
  updateTimers();
}

// ---------- actions ----------
function setTab(t) { S.mode = 'ops'; S.tab = t; if (location.hash !== '#' + t) location.hash = t; else render(); }
function signOff(key) { Live.sign(key, Date.now()); render(); const a = Ops.byKey(key); toast(a.beds ? 'Signed. The bed is released when the operator accepts.' : 'Signed off'); }
function peek(key) { S.peek = key; render(); }
function closePeek() { S.peek = null; render(); }
function ackAlert(id) {
  const L = Live.L, a = [...L.srmAlerts, ...L.medlyAlerts].find((x) => x.id === id); if (!a || a.status !== 'new') return;
  a.status = 'review'; a.ackT = Date.now();
  L.events.push({ id: ++L.seq, t: a.ackT, cat: a.app === 'medly' ? 'CDM' : 'SRM', sev: 'info', tab: a.app === 'medly' ? 'cdm' : 'home', text: `${a.app === 'medly' ? 'Medly' : 'Remote monitoring'}: nurse reviewing ${a.pt.name} (${a.rule.toLowerCase()})` });
  liveRefresh();
}

// ---------- Flow board ----------
function siteTile(x) {
  const word = { g: 'Normal', a: 'Watch', r: 'Alert' }[x.state];
  const A = D.thresholds;
  const t = `${x.name}. Occupancy ${pc(x.occPct)} (amber at ${pc(A.occ.amber)}, red at ${pc(A.occ.red)}). ALC ${pc(x.alcShare)} of occupied beds (amber ${pc(A.alcSite.amber)}, red ${pc(A.alcSite.red)}). Longest emergency wait: amber at ${A.edWait.amber / 60} h, red at ${A.edWait.red / 60} h. Now: ${x.why}.`;
  return `<div class="stile s-${x.state}" ${tip(t, 'thresholds · cerner.adt_census')}>
    <div class="st-h"><b>${esc(x.tile)}</b><span class="st-s">${word}</span></div>
    <div class="st-m"><span class="st-v c-${x.st.occ} num" data-k="occ-${x.id}">${pc(x.occPct)}</span><span class="st-u num">${x.occN} of ${x.beds} beds</span></div>
    ${tbar(x.occPct, 0.85, 1.1, [A.occ.amber, A.occ.red], x.st.occ)}
    <div class="st-f"><div><small>ALC</small><b class="num c-${x.st.alc}" data-k="alc-${x.id}">${x.alcN}</b></div><div><small>ED waiting</small><b class="num" data-k="ed-${x.id}">${x.edN}</b></div><div><small>Longest wait</small>${x.longest ? `<b class="c-${x.st.ed}">${tmr(x.longest, 'hms', { a: A.edWait.amber * MIN, r: A.edWait.red * MIN })}</b>` : '<b class="mut">–</b>'}</div></div>
  </div>`;
}
function alcChip(p) {
  const a = Ops.actions().find((x) => x.p && x.p.id === p.id && x.beds);
  if (a) { const st = Ops.status(a); return st === 'done' ? '<span class="qs good">Placed</span>' : st === 'signed' ? '<span class="qs ocean">Signed</span>' : '<span class="qs warn">Offer drafted</span>'; }
  if (p.need === 'abi' || p.need === 'complex' || p.need === 'other') return '<span class="qs zero">No setting fits</span>';
  return '<span class="qs">Waitlist</span>';
}
function queueHTML(now, X) {
  const L = Live.L, A = D.thresholds.edWait;
  const ed = [...L.ed].sort((a, b) => a.t0 - b.t0).slice(0, 11);
  const alc = Live.alc().map((p) => ({ p, t0: Live.alcT0(p) })).sort((a, b) => a.t0 - b.t0).slice(0, 11);
  return `<section class="opanel" data-p="ed">${panelH('Emergency: admitted, waiting for a bed', '', `<b class="num big" data-k="q-ed">${X.ed}</b>`)}
      <div class="osub"><span class="c-r"><b class="num" data-k="q-over">${X.edOver}</b> over ${A.red / 60} h</span><span>median wait <b class="num">${fmtHM(X.edMedian)}</b></span><span class="mut">ranked by wait</span></div>
      <div class="qlist">${ed.map((q, i) => `<div class="qrow"><span class="qn num">${i + 1}</span><span class="mono">${q.id}</span><span class="mut num">${q.age} y</span><span class="qsite">${site(q.site).code}</span><span class="qneed">${esc(q.svc)}</span>${tmr(q.t0, 'hms', { a: A.amber * MIN, r: A.red * MIN })}</div>`).join('')}</div></section>
    <section class="opanel" data-p="alc">${panelH('ALC: longest waits', '', `<b class="num big" data-k="q-alc">${X.alc}</b>`)}
      <div class="osub"><span><b class="num">${pc(X.alcShare, 1)}</b> of occupied beds</span><span>target ${pc(D.reportCard.alcTarget, 1)}</span><span class="mut">select a person to review</span></div>
      <div class="qlist">${alc.map(({ p, t0 }, i) => `<button class="qrow alc" onclick="peek('${p.persona || p.id}')"><span class="qn num">${i + 1}</span><span class="qname">${esc(p.name)}, ${p.age}</span><span class="qsite">${site(p.site).code}</span><span class="qneed">${NEED_SHORT[p.need]}</span>${alcChip(p)}${tmr(t0, 'dh')}</button>`).join('')}</div></section>`;
}
function opsMapHTML(now) {
  const OUT = `stroke="#0A111D" stroke-width="1.6" paint-order="stroke"`;
  const hoods = D.neighbourhoods.map(([n, lat, lon]) => { const [x, y] = px({ lat, lon }); return `<text x="${x}" y="${y}" text-anchor="middle" font-size="9.5" letter-spacing="1.4" fill="${PAL.light}" opacity=".45" font-family="DM Sans, sans-serif" paint-order="stroke" stroke="#0A111D" stroke-width="2.5">${n.toUpperCase()}</text>`; }).join('');
  const acts = Ops.actions();
  const lines = acts.filter((a) => a.kind === 'place').map((a) => { const s = site(a.p.site), st = Ops.status(a); if (s.coastal) return '';
    return `<path class="oline" d="${curve(px(s), px(a.node))}" stroke="${st === 'awaiting' ? PAL.amberL : PAL.sage}" ${st === 'awaiting' ? 'stroke-dasharray="5 4"' : ''} opacity="${st === 'done' ? 0.9 : 0.8}"/>`; }).join('');
  const homes = acts.filter((a) => a.kind === 'hah' || a.kind === 'srm').map((a, i) => { const s = site(a.p.site); if (s.coastal) return ''; const h = homeSpot(a.p, i + (a.kind === 'srm' ? 7 : 0)), st = Ops.status(a), col = a.kind === 'hah' ? PAL.blue : PAL.mauve;
    return `<path class="oline" d="${curve(px(s), h, 0.3)}" stroke="${col}" ${st === 'done' ? '' : 'stroke-dasharray="4 4"'}/><path d="M${(h[0] - 5).toFixed(1)} ${(h[1] + 4).toFixed(1)} v-5 l5 -5 l5 5 v5 z" fill="${st === 'done' ? col : '#0A111D'}" stroke="${col}" stroke-width="1.4"/>`; }).join('');
  const nodes = D.nodes.map((nd) => {
    const [x, y] = px(nd), c = TYPE_COL[nd.type], open = Ops.nodeOpen(nd);
    const halo = open > 0 ? `<circle cx="${x}" cy="${y}" r="13" fill="${PAL.amber}" class="halo"/><circle cx="${x}" cy="${y}" r="10.5" fill="none" stroke="${PAL.amberL}" stroke-width="1.4"/>` : '';
    let shape;
    if (nd.type === 'ltc') shape = `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${c}" ${OUT}/>`;
    else if (nd.type === 'ltcs') shape = `<rect x="${x - 6.5}" y="${y - 6.5}" width="13" height="13" fill="#0A111D"/><rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="none" stroke="${c}" stroke-width="2.2"/>`;
    else if (nd.type === 'al') shape = `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${c}" ${OUT} transform="rotate(45 ${x} ${y})"/>`;
    else if (nd.type === 'sh') shape = `<path d="M${x} ${y - 7} L${x + 6.5} ${y + 5} L${x - 6.5} ${y + 5} Z" fill="${c}" ${OUT}/>`;
    else if (nd.type === 'cch') shape = `<circle cx="${x}" cy="${y}" r="6" fill="${c}" ${OUT}/>`;
    else shape = `<path d="M${x - 6} ${y + 5} V${y - 1} L${x} ${y - 7} L${x + 6} ${y - 1} V${y + 5} Z" fill="${c}" ${OUT}/>`;
    return `<g ${tip(`${nd.name}${nd.program ? '' : ` · ${nd.beds} places`} · ${open} open now${open < nd.open ? ' · ' + (nd.open - open) + ' held for a signed offer' : ''}`, 'paris.community_capacity')}>${halo}${shape}</g>`;
  }).join('');
  const sites = D.sites.filter((s) => !s.coastal).map((s) => {
    const x0 = Ops.siteStat(s, now), [x, y] = px(s), r = 7 + Math.sqrt(x0.alcN) * 1.5, right = LABEL_DIR[s.id] !== 'left';
    return `<g ${tip(`${s.name}: ${x0.alcN} ALC patients, ${x0.edN} waiting in emergency for a bed. ${x0.why}.`, 'cerner.adt_census')}>
      <circle cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="${RAGCOL[x0.state]}" stroke-width="2.4" ${x0.state === 'r' ? 'class="halo2"' : ''}/>
      <circle cx="${x}" cy="${y}" r="${r}" fill="${PAL.blue}" stroke="#0A111D" stroke-width="2"/>
      <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${PAL.ink}" font-family="DM Sans, sans-serif">${x0.alcN}</text>
      <text x="${right ? x + r + 9 : x - r - 9}" y="${y + 4}" text-anchor="${right ? 'start' : 'end'}" font-size="12" font-weight="600" fill="${PAL.light}" font-family="DM Sans, sans-serif" paint-order="stroke" stroke="#0A111D" stroke-width="3.5">${s.short}</text></g>`;
  }).join('');
  return `<div class="omap"><svg viewBox="0 0 ${MAP.w} ${MAP.h}" role="img" aria-label="Painted map of VCH acute sites and community places, with drafted and signed offers">${hoods}${lines}${homes}${nodes}${sites}</svg>
    <div class="omaplegend">
      <span><i style="background:${PAL.blue};border-radius:50%"></i>Acute site · ALC now</span>
      <span><i style="border:2px solid ${PAL.coral};border-radius:50%"></i>Ring: site state</span>
      <span><i style="border:1.5px solid ${PAL.amberL};background:rgba(227,168,87,.5);border-radius:50%"></i>Place open now</span>
      <span><i class="ln" style="border-top:2px dashed ${PAL.amberL}"></i>Offer drafted</span>
      <span><i class="ln" style="border-top:2px solid ${PAL.sage}"></i>Offer signed</span>
      <span><i class="ln" style="border-top:2px dashed ${PAL.blue}"></i>To Hospital at Home</span>
      <span><i class="ln" style="border-top:2px dashed ${PAL.mauve}"></i>Home, monitored</span>
    </div></div>`;
}
function gauge(g) {
  const s = g.series, delta = s ? s[s.length - 1] - s[0] : 0;
  return `<div class="gauge" ${tip(g.tip, g.src)}>
    <div class="g-l"><span>${g.label}</span>${s ? `<small class="num">${delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} ${Math.abs(delta)} in 24 h</small>` : ''}</div>
    <div class="g-m"><span class="g-v c-${g.state} num" data-k="g-${g.id}">${g.value}</span>${s ? spark(s, 92, 26, RAGCOL[g.state] || PAL.blue) : ''}</div>
    ${g.bar}
    <div class="g-s">${g.sub}</div></div>`;
}
function gaugesHTML(now, X) {
  const L = Live.L, A = D.thresholds, S2 = D.surge;
  const live = (k, v) => [...L.series[k].slice(0, 23), v];
  const hahFree = X.hahCap - X.hah, srm = Ops.srm(now);
  return [
    { id: 'occ', label: 'Acute beds occupied', value: pc(X.occPct, 1), state: Ops.rag(X.occPct, A.occ), series: live('occ', X.occ), bar: tbar(X.occPct, 0.85, 1.1, [A.occ.amber, A.occ.red], Ops.rag(X.occPct, A.occ)),
      sub: `<b class="num">${n0(X.occ)}</b> of ${n0(X.beds)} funded beds`, tip: 'Occupied acute beds across all nine sites against funded beds. The sparkline counts occupied beds, hourly.', src: 'cerner.adt_census' },
    { id: 'alc', label: 'ALC in acute beds', value: n0(X.alc), state: Ops.rag(X.alcShare, A.alcSystem), series: live('alc', X.alc), bar: tbar(X.alcShare, 0.06, 0.15, [A.alcSystem.amber, A.alcSystem.red], Ops.rag(X.alcShare, A.alcSystem)),
      sub: `<b class="num">${pc(X.alcShare, 1)}</b> of beds · target ${pc(A.alcSystem.amber, 1)} · ${moneyK(X.alc * D.costs.alcDay)} a day`, tip: `Share of occupied beds held by people ready to leave. Target from the VCH report card. Cost at a conservative ${money(D.costs.alcDay)} per ALC day.`, src: 'cerner.alc_designation · costs.alc_day' },
    { id: 'ed', label: 'Waiting in emergency', value: n0(X.ed), state: X.ed >= S2[2].ed ? 'r' : X.ed >= S2[1].ed ? 'a' : 'g', series: live('ed', X.ed), bar: tbar(X.ed, 0, 90, [S2[1].ed, S2[2].ed], X.ed >= S2[2].ed ? 'r' : X.ed >= S2[1].ed ? 'a' : 'g'),
      sub: `<b class="num">${X.edOver}</b> over ${A.edWait.red / 60} h · longest ${X.edLongest ? tmr(X.edLongest, 'hms') : '–'}`, tip: `Admitted patients still in emergency. Amber at ${S2[1].ed}, red at ${S2[2].ed}: the same rules that set the surge level.`, src: 'cerner.ed_tracking' },
    { id: 'open', label: 'Community places open', value: n0(X.open), state: 'o', series: live('open', X.open), bar: tbar(X.signed, 0, X.drafted, [], 'g'),
      sub: `of ${n0(X.places)} · <b class="num">${X.signed}</b> of ${X.drafted} moves signed`, tip: 'Residential and home-support places open across the community portfolio. A place leaves this count when its offer is signed. The bar is sign-off progress.', src: 'paris.community_capacity · operator returns' },
    { id: 'hah', label: 'Hospital at Home', value: `${X.hah}<small>/${X.hahCap}</small>`, state: hahFree > 0 ? 'g' : 'a', series: live('hah', X.hah), bar: tbar(X.hah, 0, X.hahCap, [], hahFree > 0 ? 'g' : 'a'),
      sub: `<b class="num">${hahFree}</b> slots free · ${R.hah.eligible.length} candidates in acute`, tip: 'People receiving acute-level care at home now, against program capacity.', src: 'hah.program_census' },
    { id: 'srm', label: 'Remote monitoring', value: n0(X.srm), state: srm.fresh ? 'a' : 'g', series: live('srm', X.srm), bar: tbar(X.srm, 0, X.srmCap, [], 'g'),
      sub: `of ${X.srmCap} kits · <b class="num">${srm.open.length}</b> alerts open, ${srm.fresh} waiting`, tip: 'People monitored at home with a kit, against kits available.', src: 'srm.program_census' },
  ].map(gauge).join('');
}
const CAT_LAB = { ED: 'ED', FLOW: 'Flow', ALC: 'ALC', BEDS: 'Beds', HAH: 'HaH', SRM: 'SRM', CDM: 'Medly', ENGINE: 'Engine', ACTION: 'Action' };
function feedRows(n) {
  return Live.L.events.slice(-n).reverse().map((e) => `<button class="frow sev-${e.sev}" data-e="${e.id}" onclick="setTab('${e.tab}')"><span class="ft mono">${clock(e.t, true)}</span><span class="fc">${CAT_LAB[e.cat]}</span><span class="fx">${esc(e.text)}</span></button>`).join('');
}
function actRow(a) {
  const st = Ops.status(a), L = Live.L;
  const when = st === 'awaiting' && a.dueT ? ` · held ${tmr(a.dueT, 'down')}` : L.signed[a.key] ? ` · signed ${clock(L.signed[a.key])}` : '';
  return `<div class="arow k-${a.kind} a-${st}"><i></i><div class="am"><div class="at">${esc(a.title)}</div><div class="a2"><div class="as">${esc(a.owner)}${when}</div><div class="ar">${statusPill(a)}${actButtons(a)}</div></div></div></div>`;
}
// the wall shows what needs a signature first, and keeps the latest signed moves in view
function wallActions(all) {
  const L = Live.L, open = all.filter((a) => ['awaiting', 'ready'].includes(Ops.status(a)));
  const recent = all.filter((a) => !open.includes(a)).sort((a, b) => (L.accepted[b.key] || L.signed[b.key] || 0) - (L.accepted[a.key] || L.signed[a.key] || 0)).slice(0, 2);
  return [...open.slice(0, 5 - recent.length), ...recent];
}
function flowHTML() {
  const now = Date.now(), X = Ops.sys(now), all = Ops.sorted();
  const alerts = Live.L.events.filter((e) => now - e.t < 30 * MIN && (e.sev === 'red' || e.sev === 'amber')).length;
  return `<div class="b-flow">
    <section class="sites" data-p="sites">${D.sites.map((s) => siteTile(Ops.siteStat(s, now))).join('')}</section>
    <div class="ocol">${queueHTML(now, X)}</div>
    <div class="ocol">
      <section class="opanel mapp" data-p="map">${panelH('Acute sites and community places', 'now', `<span class="mut">${X.drafted} moves drafted · <b class="num" data-k="m-signed">${X.signed}</b> signed</span>`)}${opsMapHTML(now)}</section>
      <section class="gauges" data-p="gauges">${gaugesHTML(now, X)}</section>
    </div>
    <div class="ocol">
      <section class="opanel feedp" data-p="feed">${panelH('Events and alerts', 'live', `<span class="mut"><b class="num" data-k="f-al">${alerts}</b> ${alerts === 1 ? 'alert' : 'alerts'} in 30 min</span>`)}<div class="ofeed">${feedRows(12)}</div></section>
      <section class="opanel actp" data-p="acts">${panelH('Action queue', 'drafted by the engine', `<span class="rel"><b class="num" data-k="a-rel">${X.released}</b> of ${X.drafted} beds released</span>`)}
        <div class="osub"><span><b class="num" data-k="a-wait">${X.awaiting}</b> awaiting sign-off</span><span><b class="num">${all.length - X.awaiting}</b> signed</span><button class="olink" onclick="setTab('engine')">All ${all.length} in Decision engine</button></div>
        <div class="alist">${wallActions(all).map(actRow).join('')}</div></section>
    </div>
  </div>`;
}
