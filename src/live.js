/* ============================================================
   Live layer. The boards show a system in motion: a real clock,
   a seeded stream of synthetic events (bed requests, discharges,
   ALC designations, home-monitoring and Medly alerts), sign-offs
   that move through owner → operator → bed released, and alerts
   raised when a wait or a site crosses a threshold. Every event
   changes this state, and every figure on the boards is computed
   from it. Nothing here touches the guided tour's numbers.
   ============================================================ */
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pad2 = (n) => String(Math.floor(n)).padStart(2, '0');
const fmtHM = (ms) => { const m = Math.max(0, Math.round(ms / MIN)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad2(m % 60)} min`; };
const clock = (t, sec) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}${sec ? ':' + pad2(d.getSeconds()) : ''}`; };

const Live = (() => {
  const D = DATA;
  let L = null, rnd = null;
  const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const wpick = (items, w) => { let t = items.reduce((a, x) => a + w(x), 0) * rnd(); for (const x of items) { t -= w(x); if (t <= 0) return x; } return items[items.length - 1]; };
  const person = () => pick(D.nameParts.given) + ' ' + pick(D.nameParts.init);
  const unit = () => pick(D.units);
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const siteOf = (id) => D.sites.find((s) => s.id === id);

  const dayStart = (now) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };
  // "today" on the boards: since midnight, capped at 12 hours so an early-morning demo is not empty
  const todayStart = (now) => { const ds = dayStart(now); return now - ds < 3 * HOUR ? now - 3 * HOUR : Math.max(ds, now - 12 * HOUR); };
  const edLevel = (ms) => { const m = ms / MIN, T = D.thresholds.edWait; return m >= T.red ? 2 : m >= T.amber ? 1 : 0; };

  function push(e) { e.id = ++L.seq; L.events.push(e); return e; }

  // ---------- alerts from the home-monitoring and chronic-disease apps ----------
  function newAlert(app, t) {
    if (app === 'medly') {
      const r = pick(D.cdm.rules), pt = pick(D.medlyPanel);
      return { id: 'MA-' + (++L.alertSeq), app, pt, rule: r.t, sev: r.sev, reading: r.reading(ri), t, status: 'new' };
    }
    const r = pick(D.srm.rules);
    return { id: 'SA-' + (++L.alertSeq), app, pt: { id: 'S-' + ri(1000, 1999), name: person(), age: ri(66, 97) }, rule: r.t, sev: r.sev, reading: '', t, status: 'new' };
  }
  function closeAlert(a, t) {
    const esc = a.app === 'medly' && rnd() < (a.sev === 'red' ? 0.45 : 0.06);
    a.status = esc ? 'escalated' : 'resolved'; a.doneT = t;
    a.outcome = esc ? pick(D.cdm.escalations) : pick(a.app === 'medly' ? D.cdm.outcomes : D.srm.outcomes);
  }
  // the alerts already raised today when the board opens: older ones are closed, the newest are still in the queue
  function seedAlerts(app, panel, rate, now) {
    const from = todayStart(now), n = Math.max(5, Math.round(panel * rate * (now - from) / DAY));
    const out = [];
    for (let i = 0; i < n; i++) {
      const recent = i >= n - 4;
      const a = newAlert(app, recent ? now - ri(1, 26) * MIN - ri(0, 59) * 1000 : from + Math.floor(rnd() * (now - from - 30 * MIN)));
      const age = now - a.t;
      if (age > 28 * MIN) { a.ackT = a.t + ri(2, 14) * MIN; closeAlert(a, Math.min(now - MIN, a.ackT + ri(4, 25) * MIN)); }
      else if (age > 9 * MIN && rnd() < 0.7) { a.status = 'review'; a.ackT = a.t + ri(2, 8) * MIN; }
      out.push(a);
    }
    return out.sort((x, y) => x.t - y.t);
  }

  // a 24-point hourly history that ends at the current value
  function series(cur, vol, lo, hi) {
    const a = [cur];
    for (let i = 0; i < 23; i++) a.unshift(Math.round(clamp(a[0] + (rnd() - 0.5) * 2 * vol + (cur - a[0]) * 0.1, lo, hi)));
    return a;
  }

  function init(now = Date.now()) {
    rnd = mulberry32(31415926);
    Ops.reset();
    L = { born: now, seq: 0, alertSeq: 0, events: [], acceptAt: {} };
    L.occ = Object.fromEntries(D.sites.map((s) => [s.id, s.occ]));
    L.ed = D.edQueue.map((q) => { const t0 = now - q.waitMin * MIN - ri(0, 59) * 1000; return { ...q, t0, flagged: edLevel(now - t0) }; });
    L.edSeq = 7200 + D.edQueue.length;
    L.alcGone = new Set(); L.alcNew = []; L.alcSeq = 3400;
    L.signed = {}; L.accepted = {};
    L.sources = Object.fromEntries(D.sources.filter((s) => s.every).map((s) => [s.id, now - Math.floor(rnd() * s.every * 0.85) * 1000]));
    L.returns = Object.fromEntries(D.nodes.map((n) => [n.id, now - n.returnMinAgo * MIN]));
    L.hah = D.hahPatients.map((p) => ({ ...p, vitalsT: now - p.vitalsMinAgo * MIN }));
    L.srmExtra = 0; L.medlyExtra = 0;
    const srm = D.portfolio.find((p) => p.id === 'srm'), medly = D.cdm.apps[0];
    L.srmAlerts = seedAlerts('srm', srm.places - srm.open, D.srm.alertsPerPatientDay, now);
    L.medlyAlerts = seedAlerts('medly', D.medlyPanel.length, medly.alertsPerPatientDay, now);
    const hah = D.portfolio.find((p) => p.id === 'hah');
    L.series = {
      occ: series(D.occupiedAcute, 9, D.occupiedAcute - 40, D.occupiedAcute + 30),
      alc: series(D.patients.length, 3, D.patients.length - 14, D.patients.length + 12),
      ed: series(D.edQueue.length, 6, 22, 78),
      open: series(D.nodes.reduce((a, n) => a + n.open, 0), 1.6, 4, 19),
      hah: series(hah.places - hah.open, 1.4, 14, hah.places),
      srm: series(srm.places - srm.open, 3, srm.places - srm.open - 30, srm.places - srm.open + 6),
    };
    L.engineSlot = Math.floor(now / (D.schedule.engineEveryMin * MIN));
    L.siteState = null;
    L.nextEventT = now + 2600; L.nextAutoT = now + 24000;
    backfill(now);
    return L;
  }

  // the feed opens with the last 40 minutes: real entries from the seeded state, plus routine flow
  function backfill(now) {
    const since = now - 40 * MIN;
    L.ed.filter((q) => q.t0 > since).forEach((q) => push({ t: q.t0, cat: 'ED', sev: 'info', tab: 'flow', text: `Admit decision in emergency at ${siteOf(q.site).short}: ${q.svc.toLowerCase()} bed requested (${q.id})` }));
    L.ed.forEach((q) => { const T = D.thresholds.edWait; [[T.red, 'red', 'has now waited 10 hours for a bed, over target'], [T.amber, 'amber', 'has waited 6 hours for a bed']].forEach(([m, sev, txt]) => {
      const at = q.t0 + m * MIN; if (at > since && at <= now) push({ t: at, cat: 'ED', sev, tab: 'flow', text: `${q.id} at ${siteOf(q.site).short} ${txt}` }); }); });
    [['srm', L.srmAlerts, 'Remote monitoring', 'home', 'SRM'], ['medly', L.medlyAlerts, 'Medly', 'cdm', 'CDM']].forEach(([, list, label, tab, cat]) => list.forEach((a) => {
      if (a.t > since) push({ t: a.t, cat, sev: a.sev, tab, text: `${label} alert: ${a.pt.name}, ${a.rule.toLowerCase()}` });
      if (a.doneT && a.doneT > since) push({ t: a.doneT, cat, sev: a.status === 'escalated' ? 'amber' : 'good', tab, text: `${label}: ${a.pt.name}. ${a.outcome}` });
    }));
    for (let i = 0; i < 16; i++) { const t = since + Math.floor(rnd() * 38 * MIN); (rnd() < 0.5 ? flowEvent : bedAssigned)(t, false); }
    push({ t: L.engineSlot * D.schedule.engineEveryMin * MIN, cat: 'ENGINE', sev: 'info', tab: 'engine', text: `Decision engine: scheduled run complete, ${Ops.actions().length} drafted actions current` });
    L.events.sort((a, b) => a.t - b.t).forEach((e, i) => { e.id = i + 1; });
    L.seq = L.events.length;
  }

  // ---------- the stream ----------
  function bedAssigned(t, apply) {
    const sites = D.sites.filter((x) => L.ed.some((q) => q.site === x.id));
    const s = wpick(sites, (x) => x.edWaiting + 0.5);
    const qs = L.ed.filter((q) => q.site === s.id).sort((a, b) => a.t0 - b.t0);
    const q = qs[Math.min(qs.length - 1, Math.floor(Math.pow(rnd(), 2) * qs.length))];
    const waited = apply ? t - q.t0 : ri(3, 19) * HOUR + ri(0, 59) * MIN;
    if (apply) { L.ed.splice(L.ed.indexOf(q), 1); L.occ[s.id] += 1; }
    return push({ t, cat: 'ED', sev: 'good', tab: 'flow', text: `Bed assigned at ${s.short} ${unit()} after ${fmtHM(waited)} (${apply ? q.id : 'E-' + ri(7000, 7199)})` });
  }
  function edEvent(t) {
    const arrive = rnd() < clamp(0.5 + (D.edQueue.length - L.ed.length) * 0.05, 0.15, 0.85);
    if (!arrive && L.ed.length) return bedAssigned(t, true);
    const s = wpick(D.sites, (x) => x.edWaiting + 0.5);
    const q = { id: 'E-' + (L.edSeq++), site: s.id, age: ri(19, 94), svc: pick(D.services), t0: t, flagged: 0 };
    L.ed.push(q);
    return push({ t, cat: 'ED', sev: 'info', tab: 'flow', text: `Admit decision in emergency at ${s.short}: ${q.svc.toLowerCase()} bed requested (${q.id})` });
  }
  function flowEvent(t, apply) {
    const s = wpick(D.sites, (x) => x.beds);
    const out = rnd() < clamp(0.5 + (L.occ[s.id] - s.occ) * 0.12, 0.15, 0.85);
    if (apply) L.occ[s.id] += out ? -1 : 1;
    return push({ t, cat: 'FLOW', sev: out ? 'good' : 'info', tab: 'flow', text: out ? `Discharge confirmed at ${s.short} ${unit()}, bed being cleaned` : `Direct admission to ${s.short} ${unit()}` });
  }
  function alcEvent(t) {
    const cur = alc();
    const add = rnd() < clamp(0.5 + (D.patients.length - cur.length) * 0.1, 0.15, 0.85);
    const s = wpick(D.sites, (x) => x.alc);
    if (add) {
      const mix = { ltc: 10, ltcs: 3, al: 1, sh: 1.5, home: 1.5, complex: 1 };
      const need = wpick(Object.keys(mix), (n) => mix[n]);
      const young = need === 'complex' || need === 'sh';
      const p = { id: 'A-' + (L.alcSeq++), name: person(), age: young ? ri(34, 63) : ri(68, 93), site: s.id, need, dx: pick(D.needMeta[need].dx), days: 0, t0: t, fresh: true, conds: [] };
      L.alcNew.push(p);
      return push({ t, cat: 'ALC', sev: 'amber', tab: 'flow', text: `New ALC designation at ${s.short}: needs ${D.needMeta[need].label.toLowerCase()} (${p.id})` });
    }
    const held = Ops.protectedIds();
    const c = cur.filter((p) => p.site === s.id && !held.has(p.id) && !p.persona && (p.need === 'home' || p.need === 'ltc' || p.need === 'al'));
    if (!c.length) return flowEvent(t, true);
    const p = pick(c), dest = { home: 'home with supports', ltc: 'long-term care', al: 'assisted living' };
    if (p.fresh) L.alcNew.splice(L.alcNew.indexOf(p), 1); else L.alcGone.add(p.id);
    L.occ[s.id] -= 1;
    return push({ t, cat: 'ALC', sev: 'good', tab: 'flow', text: `ALC discharge from ${s.short} to ${dest[p.need]} after ${Math.round((t - alcT0(p)) / DAY)} days (${p.id})` });
  }
  function hahEvent(t) {
    const p = pick(L.hah);
    if (rnd() < 0.7) {
      p.vitalsT = t;
      if (rnd() < 0.3) p.news = clamp(p.news + (rnd() < 0.58 ? -1 : 1), 0, 7);
      const T = D.thresholds.news, sev = p.news >= T.red ? 'red' : p.news >= T.amber ? 'amber' : 'info';
      return push({ t, cat: 'HAH', sev, tab: 'home', text: `Hospital at Home: vitals in for ${p.name}, early-warning score ${p.news}${sev === 'red' ? ', review now' : sev === 'amber' ? ', watch' : ''}` });
    }
    return push({ t, cat: 'HAH', sev: 'good', tab: 'home', text: `Hospital at Home: video check-in done for ${p.name}, day ${p.day} of ${p.los}` });
  }
  function alertEvent(t, app) {
    const list = app === 'medly' ? L.medlyAlerts : L.srmAlerts;
    const label = app === 'medly' ? 'Medly' : 'Remote monitoring', tab = app === 'medly' ? 'cdm' : 'home', cat = app === 'medly' ? 'CDM' : 'SRM';
    const open = list.filter((a) => a.status === 'new' || a.status === 'review').sort((x, y) => x.t - y.t);
    if (open.length && rnd() < clamp(open.length * 0.13 - 0.05, 0, 0.85)) {
      const a = open[0];
      if (a.status === 'new') { a.status = 'review'; a.ackT = t; return push({ t, cat, sev: 'info', tab, text: `${label}: nurse reviewing ${a.pt.name} (${a.rule.toLowerCase()})` }); }
      closeAlert(a, t);
      return push({ t, cat, sev: a.status === 'escalated' ? 'amber' : 'good', tab, text: `${label}: ${a.pt.name}. ${a.outcome}` });
    }
    const a = newAlert(app, t); list.push(a);
    return push({ t, cat, sev: a.sev, tab, text: `${label} alert: ${a.pt.name}, ${a.rule.toLowerCase()}${a.reading && !/report|adherence/.test(a.reading) ? ' (' + a.reading + ')' : ''}` });
  }
  function communityEvent(t) {
    const late = D.nodes.filter((n) => t - L.returns[n.id] > DAY);
    const n = late.length && rnd() < 0.5 ? pick(late) : pick(D.nodes);
    L.returns[n.id] = t;
    return push({ t, cat: 'BEDS', sev: 'info', tab: 'beds', text: `Operator return received: ${n.name}, ${Ops.nodeOpen(n)} open` });
  }
  function nextEvent(t) {
    const k = rnd();
    if (k < 0.30) return edEvent(t);
    if (k < 0.43) return flowEvent(t, true);
    if (k < 0.51) return alcEvent(t);
    if (k < 0.63) return hahEvent(t);
    if (k < 0.75) return alertEvent(t, 'srm');
    if (k < 0.93) return alertEvent(t, 'medly');
    return communityEvent(t);
  }

  // ---------- sign-off flow: owner signs → operator accepts → bed released ----------
  function sign(key, t, by) {
    if (L.signed[key]) return;
    const a = Ops.actions().find((x) => x.key === key); if (!a) return;
    S.sent[key] = true; L.signed[key] = t;
    L.acceptAt[key] = t + (a.beds ? ri(9, 20) * 1000 : 0);
    push({ t, cat: 'ACTION', sev: 'info', tab: a.tab, text: `Signed off${by ? ' by ' + a.owner : ''}: ${a.title}` });
  }
  function accept(key, t) {
    if (L.accepted[key]) return;
    const a = Ops.actions().find((x) => x.key === key); if (!a) return;
    L.accepted[key] = t; if (!L.signed[key]) L.signed[key] = t;
    if (!a.beds) { if (a.kind === 'cdm') L.medlyExtra += 1; return; }
    const s = siteOf(a.p.site);
    L.occ[s.id] -= 1;
    if (a.kind === 'hah') L.hah.push({ id: 'H-' + (4100 + L.hah.length), name: a.p.name, age: a.p.age, dx: a.p.dx.split(';')[0], site: a.p.site, day: 1, los: ri(3, 5), news: 1, vitalsT: t, visits: [9 * 60 + 30, 16 * 60], fresh: true });
    else { L.alcGone.add(a.p.id); if (a.kind === 'srm') L.srmExtra += 1; }
    push({ t, cat: 'ACTION', sev: 'good', tab: a.tab, text: `Accepted by ${a.dest}: acute bed released at ${s.short}${a.p.unit ? ' ' + a.p.unit : ''}` });
  }

  // ---------- one second of the centre's life; returns true when something changed ----------
  function tick(now) {
    const before = L.seq;
    D.sources.forEach((s) => { if (s.every && now - L.sources[s.id] >= s.every * 1000) L.sources[s.id] = now; });
    // waits crossing a threshold raise an alert
    L.ed.forEach((q) => { const lv = edLevel(now - q.t0); if (lv > q.flagged) { q.flagged = lv;
      push({ t: now, cat: 'ED', sev: lv === 2 ? 'red' : 'amber', tab: 'flow', text: `${q.id} at ${siteOf(q.site).short} ${lv === 2 ? 'has now waited 10 hours for a bed, over target' : 'has waited 6 hours for a bed'}` }); } });
    // actions signed in the guided tour are adopted here; signed bed actions are accepted a few seconds later
    Ops.actions().forEach((a) => {
      if (a.key === 'margaret') { if (S.pkg.margaret === 'sent' && !L.accepted.margaret) accept('margaret', now); return; }
      if (S.sent[a.key] && !L.signed[a.key]) sign(a.key, now);
      if (L.signed[a.key] && !L.accepted[a.key] && now >= (L.acceptAt[a.key] || 0)) accept(a.key, now);
    });
    if (now >= L.nextAutoT) { // owners elsewhere in the system keep signing routine drafts
      const bg = Ops.actions().filter((a) => a.auto && !S.sent[a.key]);
      if (bg.length) sign(bg[0].key, now, true);
      L.nextAutoT = now + ri(38, 70) * 1000;
    }
    const slot = Math.floor(now / (D.schedule.engineEveryMin * MIN));
    if (slot > L.engineSlot) { L.engineSlot = slot; push({ t: now, cat: 'ENGINE', sev: 'info', tab: 'engine', text: `Decision engine: scheduled run complete, ${Ops.actions().filter((a) => Ops.status(a) === 'awaiting').length} actions awaiting sign-off` }); }
    if (now >= L.nextEventT) { nextEvent(now); L.nextEventT = now + 3200 + Math.floor(rnd() * 4300); }
    // a site changing state is itself an alert
    const st = Object.fromEntries(D.sites.map((s) => [s.id, Ops.siteStat(s, now).state]));
    if (L.siteState) D.sites.forEach((s) => { if (st[s.id] !== L.siteState[s.id]) { const x = Ops.siteStat(s, now);
      push({ t: now, cat: 'FLOW', sev: x.state === 'g' ? 'good' : x.state === 'a' ? 'amber' : 'red', tab: 'flow', text: `${s.short} moved to ${{ g: 'green', a: 'amber', r: 'red' }[x.state]}: ${x.why}` }); } });
    L.siteState = st;
    if (L.events.length > 80) L.events.splice(0, L.events.length - 80);
    return L.seq !== before;
  }

  const alc = () => D.patients.filter((p) => !L.alcGone.has(p.id)).concat(L.alcNew);
  const alcT0 = (p) => p.t0 || (L.born - p.days * DAY - (hash(p.id) % 86400) * 1000);

  return { init, tick, sign, accept, alc, alcT0, todayStart, dayStart, get L() { return L; } };
})();
