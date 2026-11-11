/* ============================================================
   The other four boards (Community beds, Home, CDM apps,
   Decision engine), the person drawer and huddle mode.
   ============================================================ */
const kpi = (label, value, sub, state = '', key = '') => `<div class="kpi"><div class="k-l">${label}</div><div class="k-v ${state ? 'c-' + state : ''} num"${key ? ` data-k="${key}"` : ''}>${value}</div><div class="k-s">${sub}</div></div>`;
const sevDot = (sev) => `<i class="sev s-${sev}"></i>`;
const ACK = () => ({ a: D.thresholds.ack.amber * MIN, r: D.thresholds.ack.red * MIN });

// ---------- Community beds ----------
function bedsHTML() {
  const now = Date.now(), X = Ops.sys(now), Dm = Ops.demand(), ret = Ops.returns(now);
  const offers = Ops.sorted().filter((a) => a.kind === 'place');
  const maxWait = Math.max(...Dm.rows.map((r) => r.waiting), ...Dm.none.map((r) => r[1]));
  const portfolio = Dm.rows.map((r) => {
    const st = r.openNow === 0 && r.waiting > 0 ? 'r' : r.waiting > r.openNow ? 'a' : 'g';
    return `<div class="prt" ${tip(`${r.label}: ${n0(r.occupied)} of ${n0(r.places)} places occupied. ${r.waiting} people in acute care are waiting for this setting. Illustrative cost per night.`, r.src)}>
      <div class="prt-h"><b>${esc(r.label)}</b><span class="pill ${r.openNow > 0 ? 'open' : 'zero'}"><b class="num" data-k="po-${r.id}">${r.openNow}</b> open</span></div>
      ${tbar(r.occupied / r.places, 0.9, 1, [], st)}
      <div class="prt-s"><span class="num">${n0(r.occupied)} of ${n0(r.places)} occupied</span><span class="c-${st === 'g' ? '' : st}"><b class="num">${r.waiting}</b> waiting in acute</span><span class="num">${money(r.costNight)} a night</span></div></div>`;
  }).join('');
  const vrow = (key, title, sub) => { const a = Ops.byKey(key); return row2('a-' + Ops.status(a), title, statusPill(a), sub, actButtons(a)); };
  const vfm = R.contracts.rows.map((c, i) => vrow('contract:' + i, esc(c.name.replace(/ \(.*/, '')), `<b class="c-a num">${pc(c.occ90)}</b> occupied over 90 days · ${c.empty} of ${c.units} empty · ${moneyK(c.empty * c.costNight * 365)} a year`)).join('')
    + vrow('mismatch', `${R.mismatches.stepUp + R.mismatches.stepDown} residents in the wrong level of support`, `${R.mismatches.stepUp} need more care · ${R.mismatches.stepDown} could step down from long-term care`);
  const tiles = D.nodes.map((n) => {
    const open = Ops.nodeOpen(n), acts = Ops.actions().filter((a) => a.node === n), late = now - Live.L.returns[n.id] > DAY;
    const a = acts[0], st = a ? Ops.status(a) : null;
    const line = !a ? (late ? `<span class="c-a">Full · return overdue</span>` : '<span class="mut">Full</span>')
      : st === 'awaiting' ? `<span class="c-o">Offer drafted: ${esc(a.p.name)}</span>`
      : st === 'signed' ? `<span class="c-b">Held for ${esc(a.p.name)}, signed</span>` : `<span class="c-g">Accepted ${esc(a.p.name)} today</span>`;
    return `<div class="ptile${open > 0 ? ' open' : ''}${st && st !== 'awaiting' ? ' held' : ''}" style="--tc:${TYPE_COL[n.type]}" ${tip(`${n.name}${n.program ? '' : ' · ' + n.beds + ' places'} · last operator return ${fmtHM(now - Live.L.returns[n.id])} ago${n.open ? ' · place open for ' + n.openHours + ' h' : ''}`, 'operator returns · paris.community_capacity')}>
      <div class="pt-t">${{ ltcs: 'Secured LTC', cch: 'Complex care' }[n.type] || TYPE_LAB[n.type]}</div><div class="pt-n">${esc(n.name.split(' · ')[1])}</div>
      <div class="pt-m"><span>${n.program ? 'Program' : `<b class="num">${n.beds}</b> places`}</span>${open > 0 ? `<span class="pill open num">${open} open</span>` : ''}</div>
      <div class="pt-s">${line}</div></div>`;
  }).join('');
  const bar = (label, n, open, cls, right) => `<div class="drow"><span class="d-l">${label}</span><div class="d-b"><span class="${cls}" style="width:${(n / maxWait * 100).toFixed(1)}%"></span></div><b class="num">${n}</b><span class="d-o">${right}</span></div>`;
  const demand = Dm.rows.map((r) => bar(esc(r.label), r.waiting, r.openNow, 'f-b', r.openNow > 0 ? `<span class="pill open num">${r.openNow} open</span>` : '<span class="pill zero">0 open</span>')).join('')
    + Dm.none.map(([k, n]) => bar(D.needMeta[k].label, n, 0, 'f-r', '<span class="pill zero">no setting exists</span>')).join('');
  const offerRow = (a) => { const st = Ops.status(a), t = D.portfolio.find((q) => q.id === a.node.type);
    return `<div class="orow click a-${st}" onclick="peek('${a.key}')"><div class="am"><div class="at">${esc(a.p.name)}, ${a.p.age} <span class="mut">· ${site(a.p.site).code} · ${a.p.days} d ALC${st === 'awaiting' ? ` · held ${tmr(a.dueT, 'down')}` : ''}</span></div>
      <div class="as">${esc(a.node.name)} · ${a.km.toFixed(1)} km · ${money(t.costNight)} a night</div></div><div class="ar">${statusPill(a)}${actButtons(a, true)}</div></div>`; };
  return `<div class="b-beds">
    <div class="ocol">
      <section class="opanel grow" data-p="portfolio">${panelH('Community portfolio', 'occupancy · open now · waiting in acute care', `<b class="num big c-o" data-k="b-open">${X.open}</b>`)}${portfolio}
        <div class="prt none"><div class="prt-h"><b>No setting exists in the portfolio</b><button class="obtn" onclick="setTab('engine')">Options analysis</button></div>
          <div class="prt-s"><span>${Dm.none.map(([k, n]) => `<b class="num">${n}</b> ${D.needMeta[k].label.toLowerCase()}`).join(' · ')}</span></div></div></section>
      <section class="opanel" data-p="vfm">${panelH('Value for money', '', `<span class="mut num">${R.contracts.empty} empty units · ${moneyK(R.contracts.costYr)} a year</span>`)}${vfm}</section>
    </div>
    <div class="ocol">
      <section class="opanel" data-p="places">${panelH('Place board', `${D.nodes.length} operators and programs on the map`, `<span class="mut"><b class="num">${X.open}</b> open · <b class="num">${offers.filter((a) => Ops.status(a) !== 'awaiting').length}</b> of ${offers.length} offers signed</span>`)}<div class="ptiles">${tiles}</div></section>
      <section class="opanel grow" data-p="demand">${panelH('Waiting in acute care, by where each person needs to go', 'against places open now')}${demand}</section>
    </div>
    <div class="ocol">
      <section class="opanel grow" data-p="offers">${panelH('Offers in progress', 'select a row to review the match', `<b class="num big" data-k="b-off">${offers.filter((a) => Ops.status(a) === 'awaiting').length}</b>`)}<div class="olist">${offers.map(offerRow).join('')}</div></section>
      <section class="opanel" data-p="returns">${panelH('Operator returns', 'last 24 hours', `<span class="${ret.n < ret.of ? 'c-a' : 'c-g'}"><b class="num" data-k="b-ret">${ret.n}</b> of ${ret.of} in</span>`)}
        ${ret.late.length ? ret.late.slice(0, 3).map((n) => `<div class="vrow slim"><span>${esc(n.name)}</span><span class="c-a">last return ${tmr(Live.L.returns[n.id], 'ago')} ago</span></div>`).join('') + (ret.late.length > 3 ? `<div class="vrow slim mut"><span>and ${ret.late.length - 3} more</span></div>` : '') : '<div class="vrow slim"><span class="c-g">Every operator has reported in the last 24 hours.</span></div>'}
        <div class="srcnote">Occupancy is only as current as the last return. Late returns are chased before the morning huddle.</div></section>
    </div>
  </div>`;
}

// ---------- Home: Hospital at Home and Seniors Remote Monitoring ----------
function alertRow(a) {
  const waiting = a.status === 'new';
  return `<div class="alrow ${waiting ? 'new' : ''}">${sevDot(a.sev)}<div class="am"><div class="at">${esc(a.pt.name)}, ${a.pt.age}${a.pt.nyha ? ` <span class="mut">· NYHA ${a.pt.nyha}</span>` : ''}</div><div class="as">${esc(a.rule)}${a.reading && !/report|adherence/.test(a.reading) ? ` · <b class="num">${a.reading}</b>` : ''} · raised ${clock(a.t)}</div></div>
    <div class="ar">${waiting ? `<span class="wt">waiting ${tmr(a.t, 'ms', ACK())}</span><button class="obtn pri" onclick="ackAlert('${a.id}')">Acknowledge</button>` : `<span class="pill ocean">Nurse reviewing · ${tmr(a.ackT, 'ms')}</span>`}</div></div>`;
}
const closedRow = (a) => `<div class="alrow closed"><span class="ft mono">${clock(a.doneT)}</span><div class="am"><div class="as"><b>${esc(a.pt.name)}</b> · ${esc(a.rule)}</div></div><span class="pill ${a.status === 'escalated' ? 'warn' : 'good'}">${esc(a.outcome)}</span></div>`;
function homeHTML() {
  const now = Date.now(), H = Ops.hah(now), SR = Ops.srm(now), X = Ops.sys(now), T = D.thresholds.news;
  const hahCost = D.portfolio.find((p) => p.id === 'hah').costNight, srmCost = D.portfolio.find((p) => p.id === 'srm').costNight;
  const rows = H.rows.slice(0, 24).map((p) => `<tr class="h-${p.state}"><td><b>${esc(p.name)}</b>, ${p.age}</td><td class="tr">${esc(p.dx)}</td><td class="num">${p.day} of ${p.los}</td>
    <td><span class="news n-${p.state} num" data-k="nw-${p.id}">${p.news}</span> <span class="c-${p.state === 'g' ? '' : p.state}">${{ g: 'Stable', a: 'Watch', r: 'Review now' }[p.state]}</span></td>
    <td class="r">${tmr(p.vitalsT, 'ms', { a: 60 * MIN })}</td><td class="r num">${p.tomorrow ? 'tomorrow ' : ''}${clock(p.nextT)}</td></tr>`).join('');
  const cand = (a) => `<div class="orow click a-${Ops.status(a)}" onclick="peek('${a.key}')"><div class="am"><div class="at">${esc(a.p.name)}, ${a.p.age} <span class="mut">· ${site(a.p.site).code}${a.p.unit ? ' ' + esc(a.p.unit) : ''}</span></div><div class="as">${esc(a.p.dx)}</div></div><div class="ar">${statusPill(a)}${actButtons(a, true)}</div></div>`;
  const not = R.hah.ineligible.map((p) => `<div class="orow"><div class="am"><div class="at mut">${esc(p.name)}, ${p.age} <span class="mut">· ${site(p.site).code}</span></div><div class="as">${esc(p.dx)}</div></div><div class="ar"><span class="pill zero">${esc(p.reason)}</span></div></div>`).join('');
  const hahActs = Ops.actions().filter((a) => a.kind === 'hah'), srmActs = Ops.actions().filter((a) => a.kind === 'srm');
  const room = Math.max(0, Math.floor((560 - SR.open.length * 46) / 27)); // closed rows that fit under the open queue
  return `<div class="b-home">
    <section class="opanel" data-p="hah">${panelH('Hospital at Home', 'acute care, delivered at home', `<span class="mut">sorted by early-warning score</span>`)}
      <div class="kpis">${kpi('At home now', `${H.rows.length}<small>/${H.cap}</small>`, 'people in the program', '', 'h-n')}${kpi('Slots free', H.cap - H.rows.length, 'ready for a transfer today', 'o', 'h-free')}${kpi('Visits today', `${H.visitsDone}<small>/${H.visitsPlanned}</small>`, 'nurse visits done', '', 'h-vis')}${kpi('Review now', H.review, `${H.watch} more on watch`, H.review ? 'r' : 'g', 'h-rev')}</div>
      <table class="otable"><thead><tr><th>Person</th><th>Condition</th><th>Day</th><th ${tip(`Early-warning score from the latest vitals. Watch at ${T.amber}, review now at ${T.red}.`, 'thresholds.news')}>Score</th><th class="r">Last vitals</th><th class="r">Next visit</th></tr></thead><tbody>${rows}</tbody></table></section>
    <div class="ocol">
      <section class="opanel" data-p="cands">${panelH('Could be treated at home today', 'inpatients in acute beds · select a row to review')}
        <div class="funnel"><span><b class="num">${n0(R.hah.screened)}</b> inpatients screened</span><i>›</i><span><b class="num">${R.hah.eligible.length + R.hah.ineligible.length}</b> low risk on Signal 1</span><i>›</i><span class="c-o"><b class="num">${R.hah.eligible.length}</b> meet every program criterion</span></div>
        <div class="olist">${hahActs.map(cand).join('')}${not}</div></section>
      <section class="opanel" data-p="srmc">${panelH('Can go home today with a monitoring kit', 'ALC patients waiting for home support', `<span class="mut"><b class="num">${SR.free}</b> kits free</span>`)}<div class="olist">${srmActs.map(cand).join('')}</div></section>
      <section class="opanel grow worth" data-p="worth">${panelH('Care at home, in acute beds')}
        <p><b class="num">${X.hah}</b> people are receiving acute-level care at home right now. That is <b class="num">${X.hah}</b> acute beds open for emergency and surgical patients.</p>
        <div class="kv"><span>Hospital at Home, a night</span><b>${money(hahCost)}</b></div><div class="kv"><span>Remote monitoring, a night</span><b>${money(srmCost)}</b></div><div class="kv"><span>Acute bed, patient ready to leave</span><b>${money(D.costs.alcDay)}</b></div>
        <div class="srcnote">Illustrative unit costs. Released beds refill with other patients; this is capacity, not cash.</div></section>
    </div>
    <section class="opanel" data-p="srm">${panelH('Seniors Remote Monitoring', 'a kit at home, a nurse on the alerts')}
      <div class="kpis">${kpi('Monitored now', `${n0(SR.enrolled)}<small>/${SR.cap}</small>`, 'kits in use', '', 's-n')}${kpi('Kits free', SR.free, 'ready to go out', 'o', 's-free')}${kpi('Alerts today', SR.today.length, `${SR.closed.length} closed`, '', 's-al')}${kpi('Waiting for a nurse', SR.fresh, `${SR.open.length - SR.fresh} being reviewed`, SR.fresh ? 'a' : 'g', 's-wait')}</div>
      <div class="rdg" ${tip(`Each kit should send ${D.srm.readingsPerDay} readings a day. Expected so far today against received.`, 'srm.readings')}><span>Readings in today</span>${tbar(SR.received / Math.max(1, SR.expected), 0, 1, [0.9], SR.received / Math.max(1, SR.expected) >= 0.9 ? 'g' : 'a')}<b class="num">${n0(SR.received)} of ${n0(SR.expected)}</b></div>
      <div class="osec">Triage queue</div><div class="olist">${SR.open.map(alertRow).join('') || '<div class="alrow"><span class="c-g">No alerts waiting.</span></div>'}</div>
      <div class="osec">Closed today</div><div class="olist">${SR.closed.slice(0, room).map(closedRow).join('')}</div></section>
  </div>`;
}

// ---------- CDM apps ----------
function cdmHTML() {
  const now = Date.now(), M = Ops.medly(now), C = D.cdm, app = M.app, T = D.thresholds.caseload;
  const metrics = (a) => `<div class="kpis four">${a.map(([l, v, s, st, k]) => kpi(l, v, s, st, k)).join('')}</div>`;
  const live = `<section class="opanel app live" data-p="medly">
      <div class="app-h"><span class="slot">${app.slot}</span><div><div class="app-n">${app.name} <span class="mut">· ${app.condition.toLowerCase()}</span></div><div class="app-c">With ${esc(app.partner.replace('UHN', 'UHN’s'))}</div></div><span class="pill good">● Live</span></div>
      ${metrics([['Patients enrolled', M.enrolled, 'followed at home', '', 'm-n'], ['Alerts today', M.today.length, `${M.closed.length} closed`, '', 'm-al'], ['Waiting for a nurse', M.fresh, `${M.open.length - M.fresh} being reviewed`, M.fresh ? 'a' : 'g', 'm-wait'], ['Escalations', M.escalated, 'beyond the nurse', M.escalated ? 'a' : 'g', 'm-esc']])}
      <div class="resp"><div><span>Median time to nurse review today</span><b class="num">${fmtHM(M.medianResp)}</b></div><div><span>Longest wait in the queue now</span><b>${isFinite(M.oldest) ? tmr(M.oldest, 'ms', ACK()) : 'none waiting'}</b></div><div><span>People with heart failure in acute beds now</span><b class="num">${Ops.burden('hf').n}</b></div></div>
      <div class="load" ${tip(`One nurse follows up to ${C.nurseRatio} patients on Medly. Amber at ${pc(T.amber)} of the ratio, red at ${pc(T.red)}.`, 'cdm.nurse_ratio')}><div class="load-h"><span>Nurse caseload</span><b class="num c-${M.state}" data-k="m-load">${M.perNurse} of ${C.nurseRatio}</b></div>${tbar(M.load, 0, 1.1, [T.amber, T.red], M.state)}
        <div class="as">${app.nurses} nurse, ${esc(app.clinic)} · room for <b class="num">${M.headroom}</b> more patients</div></div></section>`;
  const planned = C.apps.slice(1).map((a) => `<section class="opanel app planned">
      <div class="app-h"><span class="slot">${a.slot}</span><div><div class="app-n">To be chosen</div><div class="app-c">Go-live by ${a.milestone}</div></div><span class="pill">Planned</span></div>
      <div class="app-e">${['Enrolled', 'Alerts today', 'Nurse caseload', 'Escalations'].map((l) => `<div><span>${l}</span><b>–</b></div>`).join('')}</div>
      <div class="as">Triage queue opens at go-live</div></section>`).join('');
  const bur = C.candidates.map((c) => ({ ...c, ...Ops.burden(c.id) })), maxB = Math.max(...bur.map((b) => b.n), 1);
  const shortlist = bur.map((b) => `<div class="cand" ${tip(`${b.label}: ${b.n} people in acute beds now live with it (ALC census and screened inpatients), holding ${n0(b.days)} bed-days so far.`, 'census.conditions (synthetic)')}><b>${b.label}</b><div class="d-b"><span class="f-b" style="width:${(b.n / maxB * 100).toFixed(0)}%"></span></div><span class="num">${b.n} in acute beds now</span></div>`).join('');
  const enrol = Ops.actions().filter((a) => a.kind === 'cdm').map((a) => `<div class="orow a-${Ops.status(a)}"><div class="am"><div class="at">${esc(a.p.name)}, ${a.p.age} <span class="mut">· ${site(a.p.site).code}</span></div><div class="as">${esc(a.p.dx)} · leaving hospital today</div></div><div class="ar">${statusPill(a)}${actButtons(a)}</div></div>`).join('');
  const box = (a) => `<div class="ly-app ${a.status}"><b>${a.name || 'App ' + a.slot}</b><small>${a.status === 'live' ? a.condition : a.milestone}</small></div>`;
  const room = Math.max(0, Math.floor((420 - M.open.length * 46) / 27));
  return `<div class="b-cdm">
    ${live}
    <div class="plan" data-p="plan"><div class="plan-apps">${planned}</div>
      <section class="opanel shortlist">${panelH('Shortlist for the four planned apps', 'five candidate conditions; four are chosen with UHN on their burden of emergency visits and readmissions')}<div class="cands">${shortlist}</div></section></div>
    <section class="opanel" data-p="triage">${panelH('Medly triage queue', 'today’s alerts, most urgent first', `<span class="mut"><b class="num" data-k="m-open">${M.open.length}</b> open · thresholds: amber ${D.thresholds.ack.amber} min, red ${D.thresholds.ack.red} min without a nurse</span>`)}
      <div class="olist">${M.open.map(alertRow).join('') || '<div class="alrow"><span class="c-g">No alerts waiting.</span></div>'}</div>
      <div class="osec">Closed today</div><div class="olist two">${M.closed.slice(0, room * 2).map(closedRow).join('')}</div></section>
    <div class="ocol">
      <section class="opanel" data-p="layer">${panelH('Where the apps sit', 'proposed architecture')}
        <div class="layer">
          <div class="ly-apps">${C.apps.map(box).join('')}</div>
          <div class="ly-arr"><span>readings and alerts ↓</span><span>↑ models and rules</span></div>
          <div class="ly-s1"><span class="tagp">${C.integration.status}</span><b>Integration layer on ${C.integration.name.replace('Signal 1', 'Signal 1’s')}</b><small>one governed route for app data, alerts and models</small></div>
          <div class="ly-arr"><span>↓</span><span>↓</span><span>↓</span></div>
          <div class="ly-outs"><div><b>Clinic nurses</b><small>triage queues</small></div><div><b>This command centre</b><small>caseload and alerts</small></div><div><b>Decision engine</b><small>who to enrol, where a nurse is needed</small></div></div>
        </div>
        <div class="srcnote">Proposed design. How the apps connect to Signal 1 has not been confirmed.</div></section>
      <section class="opanel grow" data-p="enrol">${panelH('Enrol at discharge', '', `<span class="mut">Medly Month 9 · three apps Month 18 · five by Year 3</span>`)}<div class="olist">${enrol}</div></section>
    </div>
  </div>`;
}

// ---------- Decision engine ----------
const OPP_OPS = {
  place: ['place', 'Review', () => "peek('joseph')"], hah: ['hah', 'Review', () => "peek('margaret')"], srm: ['srm', 'Review', () => `peek('${R.srm[0].id}')`],
  cdm: ['cdm', 'CDM apps', () => "setTab('cdm')"], none: ['analysis', 'Full analysis', () => 'go(4)'], contracts: ['contract', 'Community beds', () => "setTab('beds')"], mismatch: ['review', 'Community beds', () => "setTab('beds')"],
};
function engOppHTML(o) {
  const [kind, label, fn] = OPP_OPS[o.id], acts = Ops.actions().filter((a) => a.kind === kind), done = acts.filter((a) => !['awaiting', 'ready'].includes(Ops.status(a))).length;
  return `<div class="opp"><div class="sev" style="background:${o.sev}"></div><div><div class="ot">${o.t()}</div><div class="os">${o.s()}</div></div>
    <div class="ar"><span class="pill ${done === acts.length ? 'good' : done ? 'ocean' : 'warn'} num">${done} of ${acts.length} signed</span><button class="obtn" onclick="${fn()}">${label}</button></div></div>`;
}
const engFoundHTML = () => (S.run === 'running' ? OPPS.filter((o) => S.shown.opps.includes(o.id)) : OPPS).map(engOppHTML).join('');
function engQueueHTML() {
  return `<div class="oscroll">${Ops.sorted().map((a) => { const st = Ops.status(a), L = Live.L;
    return `<div class="erow a-${st}"><div class="am"><div class="at">${esc(a.title)}</div><div class="as">${esc(a.owner)}${L.signed[a.key] ? ' · signed ' + clock(L.signed[a.key]) : a.dueT ? ` · place held ${tmr(a.dueT, 'down')}` : ''}</div></div><div class="ar">${statusPill(a)}${actButtons(a)}</div></div>`; }).join('')}</div>`;
}
function opsResultsHTML(m) {
  return `<div style="display:flex;gap:8px;align-items:center;margin:2px 0 10px"><span class="pill ocean">${m.totalBeds} new places</span><span class="pill ${m.placed >= R.abi.n ? 'good' : 'warn'}">places ${m.placed} of ${R.abi.n} people</span></div>
    <div class="res two">
      <div class="metric"><div class="lab">Acute bed-days released a year</div><div class="v">${n0(m.bedDays)}</div>${rangeBar(m.bd10, m.bedDays, m.bd90, Math.max(8400, m.bd90))}<div class="r">80% range ${n0(m.bd10)} to ${n0(m.bd90)}</div></div>
      <div class="metric"><div class="lab">Net capacity value a year</div><div class="v" style="color:${m.net >= 0 ? 'var(--sage)' : 'var(--coral)'}">${moneyM(m.net)}</div>${rangeBar(Math.max(0, m.net10), Math.max(0, m.net), Math.max(0, m.net90), Math.max(5e6, m.net90))}<div class="r">80% range ${moneyM(m.net10)} to ${moneyM(m.net90)}</div></div>
      <div class="metric"><div class="lab">Blended cost per night</div><div class="v">${m.totalBeds ? money(m.costPerNight) : '–'}</div><div class="r">against ${money(D.costs.alcDay)} in acute care</div></div>
      <div class="metric"><div class="lab">Cost to run a year</div><div class="v">${moneyM(m.opexYr)}</div><div class="r">plus ${m.capex ? moneyM(m.capex) + ' one-time capital' : 'no capital'}</div></div>
    </div>`;
}
function engineBoardHTML() {
  const L = Live.L, slot = D.schedule.engineEveryMin * MIN, C = R.abi, X = Ops.sys(Date.now());
  const m = Engine.abiModel({ A: S.sl.A, B: S.sl.B, C: S.sl.C }, S.sl.occ);
  const log = S.run === 'idle' ? `<div class="think">Last scheduled run, ${clock(L.engineSlot * slot)}. The engine re-reads every source every ${D.schedule.engineEveryMin} minutes.</div>` + STEPS().filter((s) => s.tool).map(feedItem).join('') : S.feed.map(feedItem).join('');
  const foot = S.run === 'idle' ? `<button class="btn lime" onclick="runEngine()" style="flex:1">Run now</button><span class="stat">next in ${tmr((L.engineSlot + 1) * slot, 'dms')}</span>`
    : S.run === 'running' ? `<button class="btn" onclick="skipEngine()" style="flex:1">Skip to results</button>`
    : `<div class="stat">Bed moves drafted<br><b>${R.released}</b></div><button class="btn" onclick="runAgain()" style="margin-left:auto">Run again</button>`;
  const opt = (o) => `<div class="eopt"><div><b>${o.id} · ${esc(o.name)}</b><div class="as">${money(o.costNight)} a night · fits ${o.fits} of ${C.n} · ready in ${o.lead}${o.capex ? ' · ' + moneyM(o.capex) + ' capital' : ''}</div></div>
    <div class="slider"><input type="range" id="sl${o.id}" min="0" max="${o.maxBeds}" value="${S.sl[o.id]}" oninput="setSl('${o.id}',this.value)" aria-label="Beds, option ${o.id}"><output id="o${o.id}">${S.sl[o.id]}</output></div></div>`;
  return `<div class="b-engine">
    <aside class="engine" data-p="log" aria-label="Decision engine activity">
      <div class="engine-h">${logoSVG(26)}<div><div class="t">Decision engine</div><div class="s">${S.run === 'running' ? '<span class="spin"></span>Running' : S.run === 'done' ? 'Done. Every figure is traced to a source.' : `Scheduled · every ${D.schedule.engineEveryMin} min`}</div></div></div>
      <div class="engine-feed" id="feed">${log}</div>
      <div class="engine-f">${foot}</div></aside>
    <div class="ocol">
      <section class="opanel" data-p="found">${panelH('What the engine found', S.run === 'running' ? 'scanning…' : OPPS.length + ' findings on the last run')}<div id="oppList" data-live="engFound">${engFoundHTML()}</div></section>
      <section class="opanel grow" data-p="queue">${panelH('Sign-off queue', 'every drafted action, its owner and its status', `<span class="rel"><b class="num">${X.released}</b> of ${X.drafted} beds released · <b class="num">${X.awaiting}</b> awaiting</span>`)}<div class="grow" style="min-height:0;display:flex" data-live="engQueue">${engQueueHTML()}</div></section>
    </div>
    <section class="opanel" data-p="analysis">${panelH('Analysis in draft: the next beds', 'for the executive', '<span class="pill warn">Draft · sign-off required</span>')}
      <p class="lead">${C.n} people with a brain injury are waiting in acute care across ${C.sites} sites, ${Math.round(C.avgDays)} days on average. Nothing in the portfolio fits them. They hold <b>${n0(C.bedDaysYr)}</b> acute bed-days a year.</p>
      ${D.abiOptions.map(opt).join('')}
      <div class="eopt"><div><b>Expected occupancy</b></div><div class="slider"><input type="range" id="slOcc" min="0.7" max="0.98" step="0.01" value="${S.sl.occ}" oninput="setSl('occ',this.value)" aria-label="Expected occupancy"><output id="oOcc">${Math.round(S.sl.occ * 100)}%</output></div></div>
      <div id="resCard">${opsResultsHTML(m)}</div>
      <div class="srcnote">Median and 80% range from 800 simulations of occupancy, placement breakdown and operating cost. Unit costs are illustrative. Released capacity refills with other patients; it is not a cash saving.</div>
      <div class="osec">Analysis pipeline</div>
      <div class="vrow slim"><span>Brain injury, no setting (${C.n} people)</span><span class="pill warn">Draft for the executive</span></div>
      <div class="vrow slim"><span>Complex concurrent needs (${R.rem.by.complex} people)</span><span class="pill">Next in the queue</span></div>
      <div class="vrow slim"><span>Housing contracts under 75% (${R.contracts.empty} empty units)</span><span class="pill">Brief drafted</span></div>
      <div style="display:flex;gap:8px;margin-top:auto;padding-top:10px;align-items:center">${(() => { const a = Ops.byKey('abi'); return statusPill(a) + actButtons(a).replace(/<button class="obtn" onclick="setTab[^>]*>Open<\/button>/, ''); })()}<button class="obtn" onclick="go(4)" style="margin-left:auto">Full analysis and executive memo</button></div></section>
  </div>`;
}
function runAgain() { clearTimeout(runTimer); S.run = 'idle'; S.feed = []; S.released = 0; S.shown = { lines: false, hah: false, srm: false, opps: [] }; runEngine(); }

// ---------- person drawer ----------
function personByKey(key) {
  const PL = personList(), hit = [...PL.go, ...PL.none].find((x) => x.key === key);
  if (hit) return hit;
  const m = R.matches.find((x) => (x.patient.persona || x.patient.id) === key); if (m) return { key, p: m.patient, kind: 'match', m };
  const s = R.srm.find((p) => p.id === key); if (s) return { key, p: s, kind: 'srm' };
  const h = R.hah.eligible.find((p) => p.id === key); if (h) return { key, p: h, kind: 'hahx' };
  const p = Live.alc().find((q) => q.id === key); if (p) return { key, p, kind: p.need === 'abi' || p.need === 'complex' ? 'none' : 'wait' };
  return null;
}
function opsDetail(x) {
  if (['hah', 'match', 'srm', 'none'].includes(x.kind)) return personDetail(x);
  const p = x.p, s = site(p.site), initials = p.name.split(' ').map((w) => w[0]).join('').replace('.', '');
  const head = (meta) => `<div class="ph"><div class="avatar">${esc(initials)}</div><div><h2>${esc(p.name)}, ${p.age}</h2><div class="pmeta">${esc(p.id)} · ${esc(s.name)} · ${meta}</div></div></div>`;
  if (x.kind === 'hahx') return head('acute inpatient') + `<div class="eyebrow">Presentation</div><p style="margin:0 0 16px;color:var(--light);font-size:15px">${esc(p.dx)}. Low risk on the Signal 1 deterioration model and inside the Hospital at Home catchment, with a caregiver at home.</p>
    <div class="card inset"><div style="font-weight:600;color:var(--light)">Transfer to Hospital at Home</div><div class="kv"><span>Program slot</span><b>1 of ${Ops.sys(Date.now()).hahCap - Live.L.hah.length} free</b></div><div class="kv"><span>Cost per night</span><b>${money(D.portfolio.find((q) => q.id === 'hah').costNight)} vs ${money(D.costs.alcDay)} in acute</b></div>
      ${actionBtn(x.key, 'Send transfer for sign-off', 'Transfer sent to Hospital at Home')}</div>`;
  const row = Ops.demand().rows.find((r) => r.need === p.need), peers = Live.alc().filter((q) => q.need === p.need).map((q) => ({ q, t: Live.alcT0(q) })).sort((a, b) => a.t - b.t);
  const pos = peers.findIndex((z) => z.q.id === p.id) + 1;
  return head(`ready to leave for ${Math.round((Date.now() - Live.alcT0(p)) / DAY)} days`) + `<div class="eyebrow">Presentation</div><p style="margin:0 0 16px;color:var(--light);font-size:15px">${esc(p.dx)}. Medically ready to leave ${esc(s.short)}. Needs: ${D.needMeta[p.need].label.toLowerCase()}.</p>
    <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div><div class="eyebrow">Needs profile</div>${needsHTML(NEED_PROFILES[p.need] || NEED_PROFILES.ltc)}</div>
    <div><div class="eyebrow">Where this person stands</div><div class="card inset"><div style="font-weight:600;color:var(--light)">${esc(D.needMeta[p.need].label)}</div>
      <div class="kv"><span>Position by wait</span><b>${pos} of ${peers.length} waiting</b></div><div class="kv"><span>Places of this kind open now</span><b>${row ? row.openNow : 0}</b></div>
      <div class="kv"><span>Engine’s draft</span><b>${row && row.openNow ? 'offered to longer waits first' : 'no open place to offer'}</b></div></div></div></div>`;
}
function drawerHTML() {
  const x = personByKey(S.peek); if (!x) return '';
  return `<div class="drawer-bg" onclick="if(event.target===this)closePeek()"><aside class="drawer" role="dialog" aria-label="Person detail"><button class="obtn dclose" onclick="closePeek()">Close ✕</button><div class="card bleed">${opsDetail(x)}</div></aside></div>`;
}

// ---------- huddle mode ----------
const HUDDLE_NOTE = 'The morning huddle runs off the wall. Each agenda item switches to the board that answers it and lights only the tiles that matter. The talking points are read from the live figures, so the huddle is the same in every room. Use Next, or the arrow keys.';
const HUDDLE = [
  { t: 'System status and surge level', who: 'Access and flow lead', tab: 'flow', hl: ['sites', 'gauges', 'surge'], side: 'r', b: (now, X) => { const red = D.sites.map((s) => Ops.siteStat(s, now)).filter((s) => s.state === 'r'), ret = Ops.returns(now);
      return [`Surge level ${X.surge.level}, ${X.surge.name.toLowerCase()}: <b>${pc(X.occPct, 1)}</b> of acute beds occupied (${n0(X.occ)} of ${n0(X.beds)}).`, `<b>${red.length}</b> of ${D.sites.length} sites over a red threshold: ${red.map((s) => s.code).join(', ') || 'none'}.`, `Data: every live feed is current; <b>${ret.n} of ${ret.of}</b> operator returns are in.`]; } },
  { t: 'Emergency: who is waiting for a bed', who: 'Access and flow lead', tab: 'flow', hl: ['ed', 'sites', 'surge'], side: 'r', b: (now, X) => { const q = [...Live.L.ed].sort((a, b) => a.t0 - b.t0)[0], by = D.sites.map((s) => [s, Live.L.ed.filter((e) => e.site === s.id).length]).sort((a, b) => b[1] - a[1])[0];
      return [`<b>${X.ed}</b> admitted patients are waiting in emergency; <b>${X.edOver}</b> have waited more than ${D.thresholds.edWait.red / 60} hours.`, q ? `Longest wait: ${q.id} at ${site(q.site).short}, <b>${fmtHM(now - q.t0)}</b> for a ${q.svc.toLowerCase()} bed.` : 'No one is waiting.', `Most pressure: ${by[0].short}, ${by[1]} waiting.`]; } },
  { t: 'ALC: longest waits, and who has nowhere to go', who: 'Transition leads', tab: 'flow', hl: ['alc', 'map'], side: 'r', b: (now, X) => { const p = Live.alc().map((q) => ({ q, t: Live.alcT0(q) })).sort((a, b) => a.t - b.t)[0];
      return [`<b>${X.alc}</b> people are ready to leave: ${pc(X.alcShare, 1)} of occupied beds against a ${pc(D.reportCard.alcTarget, 1)} target.`, `<b>${R.rem.noSetting}</b> have no setting that fits: ${R.rem.by.abi} with a brain injury, ${R.rem.by.complex} with complex concurrent needs.`, `Longest wait: ${esc(p.q.name)} at ${site(p.q.site).short}, <b>${Math.round((now - p.t) / DAY)} days</b>.`]; } },
  { t: 'Community places: open now, offers to sign', who: 'Community access lead', tab: 'beds', hl: ['places', 'offers'], side: 'l', b: (now, X) => { const off = Ops.actions().filter((a) => a.kind === 'place'), wait = off.filter((a) => Ops.status(a) === 'awaiting').sort((a, b) => a.dueT - b.dueT)[0], ret = Ops.returns(now);
      return [`<b>${X.open}</b> places are open now. ${off.length} offers drafted, <b>${off.filter((a) => Ops.status(a) !== 'awaiting').length}</b> signed.`, wait ? `First hold to lapse: ${esc(wait.node.name)}, in <b>${fmtHM(wait.dueT - now)}</b>.` : 'Every offer is signed.', `${ret.late.length} operator returns overdue; ${R.contracts.empty} contracted units empty.`]; } },
  { t: 'Hospital at Home', who: 'Hospital at Home lead', tab: 'home', hl: ['hah', 'cands'], side: 'r', b: (now) => { const H = Ops.hah(now), a = Ops.byKey('margaret');
      return [`<b>${H.rows.length}</b> of ${H.cap} people at home; <b>${H.review}</b> need review now, ${H.watch} on watch.`, `${H.visitsDone} of ${H.visitsPlanned} nurse visits done today.`, `<b>${R.hah.eligible.length}</b> inpatients could transfer today. Margaret L.: ${{ awaiting: 'package not yet assembled', ready: 'package ready to send', done: 'accepted, bed released' }[Ops.status(a)]}.`]; } },
  { t: 'Seniors Remote Monitoring', who: 'Home health lead', tab: 'home', hl: ['srm', 'srmc'], side: 'l', b: (now) => { const SR = Ops.srm(now);
      return [`<b>${n0(SR.enrolled)}</b> of ${SR.cap} kits in use; ${SR.free} free.`, `${SR.today.length} alerts today; <b>${SR.fresh}</b> waiting for a nurse.`, `<b>${R.srm.length}</b> people can leave an acute bed today with a kit.`]; } },
  { t: 'Chronic-disease apps: alerts and caseload', who: 'Heart-failure clinic nurse', tab: 'cdm', hl: ['medly', 'triage'], side: 'r', b: (now) => { const M = Ops.medly(now);
      return [`Medly: <b>${M.enrolled}</b> enrolled, ${M.perNurse} per nurse against a ratio of ${D.cdm.nurseRatio}.`, `${M.today.length} alerts today, <b>${M.fresh}</b> waiting, ${M.escalated} escalated.`, `<b>${R.cdm.n}</b> people leaving hospital today can be enrolled.`]; } },
  { t: 'Decisions needed today', who: 'CHORDS analyst on duty', tab: 'engine', hl: ['found', 'queue', 'analysis'], side: 'l', b: (now, X) => [`<b>${X.awaiting}</b> drafted actions are waiting for a signature.`, `<b>${X.released}</b> of ${X.drafted} bed moves are complete.`, `In draft for the executive: options for ${R.abi.n} people with a brain injury and no setting.`] },
  { t: 'Commitments: who does what, by when', who: 'Huddle chair', tab: 'flow', hl: ['acts', 'feed'], side: 'l', b: () => Ops.sorted().filter((a) => ['awaiting', 'ready'].includes(Ops.status(a))).slice(0, 3).map((a) => `<b>${esc(a.owner)}</b>: ${esc(a.title)}.`).concat('Next huddle: tomorrow, ' + clock(nextHuddle(Date.now())) + '.') },
];
function huddleHTML() {
  const i = S.huddle, h = HUDDLE[i], now = Date.now();
  return `<aside class="hud side-${h.side}" aria-label="Daily huddle agenda">
    <div class="hud-h"><span class="eyebrow">Daily huddle · item ${i + 1} of ${HUDDLE.length}</span><span class="mut">${tmr(S.huddleT0, 'ms')} elapsed</span></div>
    <h2>${h.t}</h2><div class="hud-who">${h.who}</div>
    <ul data-live="hud">${huddlePoints()}</ul>
    <div class="hud-f"><div class="hud-dots">${HUDDLE.map((x, j) => `<button class="${j === i ? 'on' : j < i ? 'done' : ''}" onclick="huddle(${j})" aria-label="Item ${j + 1}: ${x.t}"></button>`).join('')}</div>
      <button class="obtn" onclick="huddleStep(-1)" ${i === 0 ? 'disabled' : ''}>← Back</button><button class="obtn pri" onclick="huddleStep(1)">${i === HUDDLE.length - 1 ? 'Close huddle' : 'Next →'}</button></div></aside>`;
}
function huddlePoints() { const now = Date.now(); return HUDDLE[S.huddle].b(now, Ops.sys(now)).map((b) => `<li>${b}</li>`).join(''); }
LIVE_REGIONS.hud = huddlePoints;
function huddle(i) {
  if (i === null) { S.huddle = null; render(); return; }
  if (S.huddle === null) S.huddleT0 = Date.now();
  S.huddle = clamp(i, 0, HUDDLE.length - 1); S.peek = null;
  setTab(HUDDLE[S.huddle].tab);
}
function huddleStep(d) { const i = S.huddle + d; if (i >= HUDDLE.length) huddle(null); else huddle(i); }
