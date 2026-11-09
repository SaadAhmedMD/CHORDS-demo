/* ============================================================
   CHORDS decision engine (demo). Every figure on screen is
   computed here from DATA at runtime.
   ============================================================ */
const Engine = (() => {
  const D = DATA;
  const siteById = Object.fromEntries(D.sites.map((s) => [s.id, s]));
  const nodeById = Object.fromEntries(D.nodes.map((n) => [n.id, n]));
  const needToType = { ltc: 'ltc', al: 'al', sh: 'sh', home: 'hhs' };

  function km(a, b) {
    const R = 6371, toR = Math.PI / 180;
    const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function census() {
    const bySite = D.sites.map((s) => ({ ...s, alcCount: D.patients.filter((p) => p.site === s.id).length }));
    const byNeed = {};
    D.patients.forEach((p) => { byNeed[p.need] = (byNeed[p.need] || 0) + 1; });
    const total = D.patients.length;
    const edWaiting = D.sites.reduce((a, s) => a + s.edWaiting, 0);
    return { total, bySite, byNeed, edWaiting, patientDays: D.patients.reduce((a, p) => a + p.days, 0) };
  }

  function capacity() {
    const places = D.portfolio.filter((p) => !p.virtual).reduce((a, p) => a + p.places, 0);
    const openResidential = D.portfolio.filter((p) => !p.virtual).reduce((a, p) => a + p.open, 0);
    return { places, openResidential, portfolio: D.portfolio };
  }

  function match() {
    const taken = new Set();
    const matches = [];
    D.nodes.filter((n) => n.open > 0).forEach((node) => {
      for (let i = 0; i < node.open; i++) {
        const cands = D.patients.filter((p) => !taken.has(p.id) && needToType[p.need] === node.type);
        if (!cands.length) continue;
        cands.sort((a, b) => score(b, node) - score(a, node));
        const p = cands[0];
        taken.add(p.id);
        matches.push({ patient: p, node, km: km(siteById[p.site], node) });
      }
    });
    return { matches, taken };
  }
  function score(p, node) {
    let s = p.days - km(siteById[p.site], node) * 0.8;
    if (p.persona === 'joseph' && node.id === 'n2') s += 500; // prefers South Vancouver
    return s;
  }

  function srm(taken) {
    const c = D.patients.filter((p) => p.need === 'home' && !taken.has(p.id) && p.age >= 65)
      .sort((a, b) => b.days - a.days).slice(0, D.srmCandidates);
    c.forEach((p) => taken.add(p.id));
    return c;
  }

  function hah() {
    const eligible = D.inpatients.filter((p) => p.eligible !== false);
    const screened = D.occupiedAcute;
    return { screened, eligible, ineligible: D.inpatients.filter((p) => p.eligible === false) };
  }

  function remaining(taken) {
    const rest = D.patients.filter((p) => !taken.has(p.id));
    const by = {};
    rest.forEach((p) => { by[p.need] = (by[p.need] || 0) + 1; });
    const noSetting = (by.abi || 0) + (by.complex || 0);
    return { rest, by, noSetting };
  }

  function abiCohort() {
    const c = D.patients.filter((p) => p.need === 'abi');
    const avgDays = c.reduce((a, p) => a + p.days, 0) / c.length;
    const sites = new Set(c.map((p) => p.site)).size;
    const bedDaysYr = c.length * 365;
    return { n: c.length, avgDays, sites, bedDaysYr, valueYr: bedDaysYr * D.costs.alcDay, patients: c };
  }

  // Options model with Monte Carlo bounds. beds = {A,B,C}, occ = central occupancy
  function abiModel(beds, occ) {
    const cohort = abiCohort();
    const opts = D.abiOptions;
    const placedRaw = opts.reduce((a, o) => a + Math.min(beds[o.id] || 0, o.maxBeds, o.fits), 0);
    const placed = Math.min(cohort.n, placedRaw);
    const totalBeds = opts.reduce((a, o) => a + (beds[o.id] || 0), 0);
    const opexYr = opts.reduce((a, o) => a + (beds[o.id] || 0) * o.costNight * 365, 0);
    const capex = opts.reduce((a, o) => a + ((beds[o.id] || 0) > 0 ? o.capex : 0), 0);
    // Monte Carlo bounds: occupancy, placement breakdown, cost overrun (acute cost held at the conservative rate)
    const r = mulberry32(42);
    const sims = [];
    for (let i = 0; i < 800; i++) {
      const o = Math.max(0.6, Math.min(0.99, occ + (r() - 0.5) * 0.14));
      const breakdown = r() * 0.15;
      const costMul = 1 + (r() + r() + r() - 1.5) * 0.16;
      const bd = placed * 365 * o * (1 - breakdown);
      sims.push({ bd, net: bd * D.costs.alcDay - opexYr * costMul });
    }
    const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
    const bedDays = q(sims.map((s) => s.bd), 0.5);
    const value = bedDays * D.costs.alcDay;
    const net = q(sims.map((s) => s.net), 0.5);
    return {
      cohort, totalBeds, placed, opexYr, capex, bedDays, value, net,
      admissions: bedDays / D.costs.avgLos,
      costPerNight: totalBeds ? opexYr / (totalBeds * 365) : 0,
      bd10: q(sims.map((s) => s.bd), 0.1), bd90: q(sims.map((s) => s.bd), 0.9),
      net10: q(sims.map((s) => s.net), 0.1), net90: q(sims.map((s) => s.net), 0.9),
    };
  }

  function contracts() {
    const rows = D.contracts.map((c) => ({ ...c, empty: Math.round(c.units * (1 - c.occ90)) }));
    const empty = rows.reduce((a, c) => a + c.empty, 0);
    return { rows, empty, costYr: rows.reduce((a, c) => a + c.empty * c.costNight * 365, 0) };
  }

  function runAll() {
    const cen = census();
    const cap = capacity();
    const m = match();
    const s = srm(m.taken);
    const h = hah();
    const rem = remaining(m.taken);
    const released = m.matches.length + s.length + h.eligible.length;
    return { cen, cap, matches: m.matches, srm: s, hah: h, rem, released,
      valueDay: released * D.costs.alcDay, valueYr: released * D.costs.alcDay * 365,
      mismatches: D.mismatches, contracts: contracts(), abi: abiCohort() };
  }

  return { census, capacity, runAll, abiModel, abiCohort, km, siteById, nodeById };
})();
if (typeof module !== 'undefined') module.exports = { Engine };
