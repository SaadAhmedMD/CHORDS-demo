/* ============================================================
   Operations layer — extra synthetic detail for the live boards.
   Everything here is illustrative and generated from its own
   seeded stream, so the census above (and every figure in the
   guided tour) is unchanged. The boards compute what they show
   from this layer plus DATA; nothing is typed into the UI.
   ============================================================ */
(() => {
  const D = DATA;
  const rnd = mulberry32(20261111);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const GIVEN = ['Ada', 'Ben', 'Clara', 'David', 'Edith', 'Farid', 'Grace', 'Hiro', 'Irene', 'Jun', 'Karen', 'Luis', 'Mina', 'Nora', 'Omar', 'Paula', 'Raj', 'Sun', 'Tom', 'Uma', 'Vera', 'Wei', 'Yusuf', 'Zoe'];
  const INIT = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'J.', 'K.', 'L.', 'M.', 'N.', 'P.', 'R.', 'S.', 'T.', 'W.'];
  const person = () => pick(GIVEN) + ' ' + pick(INIT);

  // ---- acute sites: occupied beds, short codes ---------------------------
  const occupied = { vgh: 714, sph: 412, msj: 118, ubch: 92, rh: 251, lgh: 277, sqgh: 19, sech: 38, qgh: 27 };
  const code = { vgh: 'VGH', sph: 'SPH', msj: 'MSJ', ubch: 'UBCH', rh: 'RH', lgh: 'LGH', sqgh: 'SGH', sech: 'SECH', qgh: 'QGH' };
  D.sites.forEach((s) => { s.occ = occupied[s.id]; s.code = code[s.id]; s.tile = s.id === 'qgh' ? 'qathet' : s.short; });
  D.occupiedAcute = D.sites.reduce((a, s) => a + s.occ, 0);

  // ---- thresholds behind every red / amber / green state (illustrative) --
  D.thresholds = {
    occ:    { amber: 0.95, red: 1.00, label: 'Acute occupancy', unit: '%' },
    alcSite:   { amber: 0.20, red: 0.25, label: 'ALC share of a site’s occupied beds' },
    alcSystem: { amber: D.reportCard.alcTarget, red: 0.125, label: 'ALC share of occupied beds, system (amber at the VCH target)' },
    edWait: { amber: 6 * 60, red: 10 * 60, label: 'Longest emergency wait for a bed', unit: 'min' },
    ack:    { amber: 15, red: 30, label: 'Alert waiting for a nurse', unit: 'min' },
    news:   { amber: 3, red: 5, label: 'Early-warning score at home' },
    caseload: { amber: 0.85, red: 1.0, label: 'Nurse caseload against the ratio' },
  };
  // system surge level: the highest level whose occupancy OR emergency-wait rule is met
  D.surge = [
    { level: 1, name: 'Normal',        occ: 0,    ed: 0 },
    { level: 2, name: 'Busy',          occ: 0.95, ed: 30 },
    { level: 3, name: 'Over capacity', occ: 1.00, ed: 50 },
    { level: 4, name: 'Critical',      occ: 1.04, ed: 80 },
  ];

  // ---- data sources and how often each should refresh (seconds) ----------
  D.sources = [
    { id: 'cerner',    name: 'Cerner ADT',       every: 60,  stale: 180 },
    { id: 's1',        name: 'Signal 1',         every: 300, stale: 600 },
    { id: 'paris',     name: 'PARIS',            every: 900, stale: 1800 },
    { id: 'hah',       name: 'HaH census',       every: 300, stale: 900 },
    { id: 'srm',       name: 'Remote monitoring', every: 600, stale: 1800 },
    { id: 'medly',     name: 'Medly',            every: 120, stale: 600 },
    { id: 'operators', name: 'Operator returns', batch: 'daily' },
    { id: 'contracts', name: 'Contracts',        batch: 'weekly' },
    { id: 'finance',   name: 'Finance GL',       batch: 'monthly' },
  ];
  D.schedule = { huddle: [8, 30], engineEveryMin: 30, vacancyHoldHours: 72 }; // operators hold a vacancy for a referral for 72 hours

  // ---- emergency patients admitted and waiting for a bed -----------------
  const services = ['Medicine', 'Medicine', 'Medicine', 'Medicine', 'Surgery', 'Cardiology', 'Neurology', 'Orthopaedics', 'Mental health', 'Geriatrics'];
  D.edQueue = [];
  D.sites.forEach((s) => {
    for (let i = 0; i < s.edWaiting; i++) {
      const hours = Math.pow(rnd(), 1.7) * (s.coastal ? 9 : 26);
      D.edQueue.push({ id: 'E-' + (7200 + D.edQueue.length), site: s.id, age: ri(19, 94), svc: pick(services), waitMin: Math.round(20 + hours * 60) });
    }
  });

  // ---- community places: when each operator last reported, how long a place has been open
  D.nodes.forEach((n) => {
    n.returnOverdue = n.open === 0 && rnd() < 0.15;        // open places are always confirmed today
    n.returnMinAgo = n.returnOverdue ? ri(26, 31) * 60 : ri(40, 400);
    n.openHours = n.open > 0 ? ri(3, 60) : 0;
  });

  // ---- long-term conditions carried by the people in the census ----------
  // (seeded prevalence; used to size the candidate chronic-disease apps)
  const prevalence = { hf: 0.19, copd: 0.16, dm: 0.27, htn: 0.52, ckd: 0.14, hnc: 0.02 };
  const dxRule = { hf: /heart failure/i, copd: /copd/i };
  const flag = (p) => {
    const older = p.age >= 65 ? 1 : 0.55;
    p.conds = Object.keys(prevalence).filter((c) => (dxRule[c] && dxRule[c].test(p.dx)) || rnd() < prevalence[c] * older);
  };
  D.patients.forEach(flag);
  D.inpatients.forEach(flag);

  // ---- Hospital at Home: the people at home now --------------------------
  const hah = D.portfolio.find((p) => p.id === 'hah');
  const hahDx = ['Heart failure', 'COPD exacerbation', 'Cellulitis, IV antibiotics', 'Pneumonia', 'Urinary infection, IV antibiotics', 'Post-operative recovery', 'Dehydration, frailty', 'Diabetes, unstable glucose'];
  const metro = D.sites.filter((s) => !s.coastal);
  D.hahPatients = Array.from({ length: hah.places - hah.open }, (_, i) => {
    const day = ri(1, 6);
    return { id: 'H-' + (4100 + i), name: person(), age: ri(58, 93), dx: pick(hahDx), site: pick(metro).id, day, los: day + ri(1, 4),
      news: Math.floor(Math.pow(rnd(), 2.6) * 7), vitalsMinAgo: ri(2, 52), visits: [ri(8 * 60, 11 * 60 + 30), ri(14 * 60, 18 * 60 + 30)] };
  });

  // ---- Seniors Remote Monitoring: alert rules ----------------------------
  D.srm = {
    alertsPerPatientDay: 0.04, readingsPerDay: 2, adherence: 0.93,
    rules: [
      { t: 'Weight up 2 kg in 3 days', sev: 'amber' }, { t: 'Oxygen saturation under 90%', sev: 'red' },
      { t: 'Blood pressure high, 3 readings', sev: 'amber' }, { t: 'No readings for 48 hours', sev: 'amber' },
      { t: 'Resting heart rate over 110', sev: 'red' }, { t: 'Blood pressure low with dizziness', sev: 'red' },
      { t: 'Temperature over 38.0', sev: 'amber' },
    ],
    outcomes: ['Phone check, settled', 'Home visit booked today', 'Medication reviewed by pharmacist', 'GP notified', 'Family reached, readings resumed'],
  };

  // ---- chronic-disease management apps -----------------------------------
  const medlyPanel = 187;
  D.cdm = {
    nurseRatio: 250, // one nurse follows up to 250 patients on Medly
    integration: { name: 'Signal 1 AI platform', status: 'proposed, to be confirmed' },
    apps: [
      { id: 'medly', slot: 1, name: 'Medly', condition: 'Heart failure', cond: 'hf', status: 'live', milestone: 'Month 9', partner: 'UHN Centre for Digital Therapeutics', clinic: 'VCH heart-failure clinic', nurses: 1, alertsPerPatientDay: 0.18 },
      { id: 'app2', slot: 2, status: 'planned', milestone: 'Month 18' },
      { id: 'app3', slot: 3, status: 'planned', milestone: 'Month 18' },
      { id: 'app4', slot: 4, status: 'planned', milestone: 'Year 3' },
      { id: 'app5', slot: 5, status: 'planned', milestone: 'Year 3' },
    ],
    candidates: [
      { id: 'copd', label: 'COPD' }, { id: 'dm', label: 'Diabetes' }, { id: 'htn', label: 'Hypertension' },
      { id: 'ckd', label: 'Kidney disease' }, { id: 'hnc', label: 'Head and neck cancer' },
    ],
    rules: [
      { t: 'Weight up 2 kg or more in 3 days', sev: 'amber', reading: (ri) => `+${(ri(20, 34) / 10).toFixed(1)} kg` },
      { t: 'Breathless at rest, new', sev: 'red', reading: () => 'symptom report' },
      { t: 'Systolic pressure under 90, dizzy', sev: 'red', reading: (ri) => `${ri(81, 89)} mmHg` },
      { t: 'Resting heart rate over 110', sev: 'amber', reading: (ri) => `${ri(111, 128)} bpm` },
      { t: 'Ankle swelling worse', sev: 'amber', reading: () => 'symptom report' },
      { t: 'No readings for 3 days', sev: 'amber', reading: () => 'adherence' },
    ],
    outcomes: ['Diuretic adjusted per protocol', 'Self-care coaching call', 'Clinic visit booked this week', 'Readings resumed after call'],
    escalations: ['Escalated to clinic cardiologist', 'Sent to emergency, clinic notified'],
  };
  D.medlyPanel = Array.from({ length: medlyPanel }, (_, i) => ({ id: 'M-' + (6000 + i), name: person(), age: ri(52, 91), nyha: pick([1, 2, 2, 2, 3, 3, 4]), enrolledDays: ri(3, 260) }));

  // ---- who owns each kind of drafted action ------------------------------
  D.owners = {
    place: (s) => `Transition lead · ${s.code}`,
    hah: () => 'Hospital at Home intake nurse',
    srm: (s) => `Home health liaison · ${s.code}`,
    cdm: () => 'Heart-failure clinic nurse',
    contract: () => 'Contracts lead, Community',
    analysis: () => 'Executive lead, Community',
    review: () => 'Community care managers',
  };
  D.services = services;
  D.nameParts = { given: GIVEN, init: INIT };
  D.units = ['3 North', '4 East', '5 West', '6 East', '7 West', '8 South', '9 North', '10 East', '11 West', '12 South'];
})();
