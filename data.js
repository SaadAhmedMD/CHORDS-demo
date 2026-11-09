/* ============================================================
   CHORDS Command Centre — illustrative data layer
   Shaped like the real sources (Cerner acute census, PARIS
   community data, operator returns, contracts database, finance
   GL, Signal 1 model outputs). ALL PATIENT DATA IS SYNTHETIC.
   Acute site names are real; their numbers are illustrative.
   ============================================================ */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DATA = (() => {
  const sites = [
    { id: 'vgh',  name: 'Vancouver General Hospital', short: 'VGH',             org: 'VCH',        lat: 49.2618, lon: -123.1234, beds: 700, alc: 62, edWaiting: 19 },
    { id: 'sph',  name: "St. Paul's Hospital",        short: "St. Paul's",      org: 'Providence', lat: 49.2803, lon: -123.1291, beds: 400, alc: 38, edWaiting: 14 },
    { id: 'msj',  name: 'Mount Saint Joseph Hospital', short: 'Mount St. Joseph', org: 'Providence', lat: 49.2588, lon: -123.0933, beds: 120, alc: 22, edWaiting: 3 },
    { id: 'ubch', name: 'UBC Hospital',               short: 'UBC Hospital',    org: 'VCH',        lat: 49.2643, lon: -123.2457, beds: 100, alc: 18, edWaiting: 0 },
    { id: 'rh',   name: 'Richmond Hospital',          short: 'Richmond',        org: 'VCH',        lat: 49.1683, lon: -123.1452, beds: 240, alc: 34, edWaiting: 9 },
    { id: 'lgh',  name: 'Lions Gate Hospital',        short: 'Lions Gate',      org: 'VCH',        lat: 49.3207, lon: -123.0711, beds: 270, alc: 30, edWaiting: 8 },
    { id: 'sqgh', name: 'Squamish General Hospital',  short: 'Squamish',        org: 'VCH',        lat: 49.7016, lon: -123.1558, beds: 20,  alc: 5,  edWaiting: 1, coastal: true },
    { id: 'sech', name: 'Sechelt Hospital',           short: 'Sechelt',         org: 'VCH',        lat: 49.4742, lon: -123.7545, beds: 40,  alc: 7,  edWaiting: 2, coastal: true },
    { id: 'qgh',  name: 'qathet General Hospital',    short: 'qathet (Powell River)', org: 'VCH',  lat: 49.8352, lon: -124.5247, beds: 30,  alc: 5,  edWaiting: 1, coastal: true },
  ];

  // Community portfolio (illustrative). costNight = illustrative cost per bed-night.
  const portfolio = [
    { id: 'ltc',   label: 'Long-term care',              places: 4600, open: 4,  costNight: 320,  src: 'PARIS · operator returns' },
    { id: 'ltcs',  label: 'Secured long-term care',      places: 380,  open: 0,  costNight: 460,  src: 'PARIS · operator returns' },
    { id: 'al',    label: 'Assisted living',             places: 1050, open: 3,  costNight: 165,  src: 'PARIS · operator returns' },
    { id: 'sh',    label: 'Supported housing (MHSU)',    places: 2200, open: 4,  costNight: 120,  src: 'contracts database · operator returns' },
    { id: 'cch',   label: 'Complex care housing',        places: 140,  open: 0,  costNight: 350,  src: 'contracts database' },
    { id: 'hhs',   label: 'Intensive home support',      places: 60,   open: 2,  costNight: 240,  src: 'PARIS · home health' },
    { id: 'hah',   label: 'Hospital at Home',            places: 30,   open: 8,  costNight: 650,  src: 'HaH program census', virtual: true },
    { id: 'srm',   label: 'Seniors Remote Monitoring',   places: 700,  open: 88, costNight: 12,   src: 'SRM program census', virtual: true },
  ];

  // Community sites for the map (generic names; numbers illustrative)
  const nodes = [
    { id: 'n1',  type: 'ltc', name: 'Long-term care · Kerrisdale',       lat: 49.2330, lon: -123.1560, beds: 142, open: 1 },
    { id: 'n2',  type: 'ltc', name: 'Long-term care · Marpole',          lat: 49.2105, lon: -123.1300, beds: 118, open: 1 },
    { id: 'n3',  type: 'ltc', name: 'Long-term care · Kensington',       lat: 49.2440, lon: -123.0780, beds: 160, open: 1 },
    { id: 'n4',  type: 'ltc', name: 'Long-term care · Richmond Centre',  lat: 49.1700, lon: -123.1250, beds: 175, open: 1 },
    { id: 'n5',  type: 'ltc', name: 'Long-term care · North Vancouver',  lat: 49.3260, lon: -123.0900, beds: 130, open: 0 },
    { id: 'n6',  type: 'ltc', name: 'Long-term care · Dunbar',           lat: 49.2480, lon: -123.1850, beds: 96,  open: 0 },
    { id: 'n7',  type: 'ltcs',name: 'Secured LTC · South Vancouver',     lat: 49.2190, lon: -123.0750, beds: 64,  open: 0 },
    { id: 'n8',  type: 'ltcs',name: 'Secured LTC · Richmond',            lat: 49.1580, lon: -123.1600, beds: 48,  open: 0 },
    { id: 'n9',  type: 'al',  name: 'Assisted living · Fairview',        lat: 49.2650, lon: -123.1300, beds: 88,  open: 1 },
    { id: 'n10', type: 'al',  name: 'Assisted living · Steveston',       lat: 49.1530, lon: -123.1800, beds: 72,  open: 1 },
    { id: 'n11', type: 'al',  name: 'Assisted living · Lonsdale',        lat: 49.3150, lon: -123.0750, beds: 64,  open: 1 },
    { id: 'n12', type: 'sh',  name: 'Supported housing · Strathcona',    lat: 49.2790, lon: -123.0920, beds: 96,  open: 1 },
    { id: 'n13', type: 'sh',  name: 'Supported housing · Downtown South',lat: 49.2760, lon: -123.1260, beds: 74,  open: 1 },
    { id: 'n14', type: 'sh',  name: 'Supported housing · Mount Pleasant',lat: 49.2620, lon: -123.1000, beds: 58,  open: 1 },
    { id: 'n15', type: 'sh',  name: 'Supported housing · Grandview',     lat: 49.2700, lon: -123.0690, beds: 52,  open: 1 },
    { id: 'n16', type: 'sh',  name: 'Supported housing · West End',      lat: 49.2860, lon: -123.1400, beds: 48,  open: 0 },
    { id: 'n17', type: 'cch', name: 'Complex care housing · DTES',       lat: 49.2820, lon: -123.0990, beds: 40,  open: 0 },
    { id: 'n18', type: 'cch', name: 'Complex care housing · Fraserview', lat: 49.2220, lon: -123.0600, beds: 30,  open: 0 },
    { id: 'n19', type: 'hhs', name: 'Home health · Vancouver West',      lat: 49.2520, lon: -123.1650, beds: 0,   open: 1, program: true },
    { id: 'n20', type: 'hhs', name: 'Home health · Richmond',            lat: 49.1800, lon: -123.1100, beds: 0,   open: 1, program: true },
  ];

  const neighbourhoods = [
    ['Downtown', 49.2925, -123.1350], ['Kitsilano', 49.2680, -123.1650], ['UBC', 49.2530, -123.2420],
    ['Kerrisdale', 49.2260, -123.1620], ['Marpole', 49.2040, -123.1420], ['East Vancouver', 49.2350, -123.0600],
    ['Richmond', 49.1520, -123.1900], ['North Vancouver', 49.3330, -123.0650], ['West Vancouver', 49.3320, -123.1600],
    ['Downtown Eastside', 49.2885, -123.0880],
  ];
  // ---- synthetic ALC census (221 patients) -------------------------------
  // need: destination the person needs; counts tuned to the demo story.
  const needCounts = [
    ['ltc', 102], ['ltcs', 31], ['al', 9], ['sh', 14], ['home', 10], ['abi', 23], ['complex', 19], ['other', 13],
  ];
  const needMeta = {
    ltc:     { label: 'Long-term care',               dx: ['Frailty, falls', 'Advanced dementia', 'Post-stroke, dependent', 'Parkinson disease, falls', 'Heart failure, frailty', 'COPD, dependent ADLs'] },
    ltcs:    { label: 'Secured long-term care',       dx: ['Dementia with exit-seeking', 'Dementia with agitation', 'Frontotemporal dementia', 'Dementia with wandering'] },
    al:      { label: 'Assisted living',              dx: ['Deconditioning, lives alone', 'Mild cognitive impairment', 'Post hip fracture, recovered'] },
    sh:      { label: 'Supported housing',            dx: ['Schizophrenia, stable', 'Concurrent disorders, stable', 'Bipolar disorder, stable'] },
    home:    { label: 'Home with supports',           dx: ['Post-op, needs home support', 'COPD, home oxygen', 'Heart failure, lives with spouse', 'Deconditioning after pneumonia'] },
    abi:     { label: 'Brain injury, neuropsychiatric', dx: ['Hypoxic brain injury after overdose', 'Traumatic brain injury, disinhibition', 'Hypoxic brain injury, agitation'] },
    complex: { label: 'Complex care (concurrent needs)', dx: ['Concurrent disorders, wound care', 'Unhoused, IV antibiotics completed', 'Unhoused, amputation', 'Concurrent disorders, mobility'] },
    other:   { label: 'Specialized (bariatric, airway)', dx: ['Bariatric, 2-person transfers', 'Tracheostomy, weaning', 'Ventilator-dependent'] },
  };
  const first = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'J.', 'K.', 'L.', 'M.', 'N.', 'P.', 'R.', 'S.', 'T.', 'W.'];
  const given = ['Ada', 'Ben', 'Clara', 'David', 'Edith', 'Farid', 'Grace', 'Hiro', 'Irene', 'Jun', 'Karen', 'Luis', 'Mina', 'Nora', 'Omar', 'Paula', 'Raj', 'Sun', 'Tom', 'Uma', 'Vera', 'Wei', 'Yusuf', 'Zoe'];
  const rnd = mulberry32(20261108);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  // site slots proportional to ALC counts
  const siteSlots = [];
  sites.forEach((s) => { for (let i = 0; i < s.alc; i++) siteSlots.push(s.id); });
  for (let i = siteSlots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [siteSlots[i], siteSlots[j]] = [siteSlots[j], siteSlots[i]]; }

  const patients = [];
  let k = 0;
  needCounts.forEach(([need, n]) => {
    for (let i = 0; i < n; i++) {
      const young = need === 'abi' || need === 'complex' || need === 'sh';
      const age = young ? 34 + Math.floor(rnd() * 30) : 68 + Math.floor(rnd() * 26);
      const days = need === 'abi' ? 40 + Math.floor(rnd() * 90) : need === 'complex' ? 30 + Math.floor(rnd() * 80)
        : need === 'ltcs' ? 25 + Math.floor(rnd() * 70) : 4 + Math.floor(rnd() * 60);
      patients.push({
        id: 'A-' + (3100 + k), name: pick(given) + ' ' + pick(first), age, site: siteSlots[k], need,
        dx: pick(needMeta[need].dx), days,
      });
      k++;
    }
  });

  // ---- named personas (replace three generated rows) --------------------
  const personas = {
    daniel: { id: 'A-2088', name: 'Daniel R.', age: 49, site: 'vgh', need: 'abi', days: 81, unit: '7 West', persona: 'daniel',
      dx: 'Hypoxic brain injury after overdose (2025)',
      presentation: 'Medically stable for 81 days. Hypoxic brain injury after an overdose last year, with disinhibition, impulsivity and episodes of agitation. Mobile and physically well. Needs 24-hour supervision and a behaviour support plan. Was unhoused before admission.',
      needsProfile: [ ['24-hour supervision', 0.92], ['Behaviour support (agitation, disinhibition)', 0.85], ['Psychiatry and medication management', 0.7], ['Personal care', 0.3], ['Mobility support', 0.1] ],
      fit: [
        ['Long-term care', false, 'Declined by 3 homes: behaviours; under 65'],
        ['Secured long-term care', false, 'No vacancy; designed for dementia, not younger brain injury'],
        ['Assisted living', false, 'Needs 24-hour supervision'],
        ['Supported housing', false, 'Care needs exceed staffing model'],
        ['Complex care housing', false, 'No vacancy (140 of 140 places full)'],
        ['Home with supports', false, 'No home'],
      ] },
    margaret: { id: 'I-5521', name: 'Margaret L.', age: 84, site: 'vgh', need: 'hah', days: 2, unit: '6 East', persona: 'margaret', inpatient: true,
      dx: 'Heart failure exacerbation (acute inpatient, day 2)',
      presentation: 'Admitted two days ago with a heart failure exacerbation. Responding to IV diuretics; oxygen weaned. Lives with her husband, 4 km from VGH. Still needs acute-level care for several days, but it can be delivered at home.',
      criteria: [ ['Clinically stable on Signal 1 deterioration model (low risk, 48 h)', true], ['Treatment deliverable at home (IV diuretic, daily labs)', true], ['Lives inside the Hospital at Home catchment', true], ['Caregiver at home', true], ['Patient and family consent', true] ],
      package: ['History and physical', 'Medication reconciliation', 'Hospital at Home care plan', 'Daily lab orders', 'Medly enrolment (heart failure app)', 'Seniors Remote Monitoring kit', 'Family briefing note'] },
    joseph: { id: 'A-2291', name: 'Joseph T.', age: 79, site: 'sph', need: 'ltc', days: 46, unit: '9 North', persona: 'joseph',
      dx: 'Frailty, falls; waiting for long-term care',
      presentation: 'Medically stable for 46 days. Frailty with repeated falls; needs help with most daily activities. On the long-term-care waitlist. Prefers to stay near his daughter in South Vancouver.',
      needsProfile: [ ['Personal care', 0.8], ['Mobility support (falls)', 0.75], ['Nursing oversight', 0.4], ['Supervision', 0.3], ['Behaviour support', 0.05] ] },
  };
  // swap persona rows into the census (keep total = 221 and per-site counts)
  const swapIn = (pers) => {
    const idx = patients.findIndex((p) => p.need === pers.need && p.site === pers.site && !p.persona);
    if (idx >= 0) patients[idx] = { ...patients[idx], ...pers };
  };
  swapIn(personas.daniel);
  swapIn(personas.joseph);

  // ---- acute inpatients screened for Hospital at Home (not ALC) ---------
  const inpatients = [
    { ...personas.margaret },
    { id: 'I-5530', name: 'Peter H.',  age: 77, site: 'vgh', dx: 'Cellulitis, IV antibiotics', eligible: true },
    { id: 'I-5544', name: 'Lena S.',   age: 69, site: 'rh',  dx: 'Pneumonia, improving', eligible: true },
    { id: 'I-5561', name: 'Amir K.',   age: 73, site: 'lgh', dx: 'COPD exacerbation', eligible: true },
    { id: 'I-5573', name: 'Rose D.',   age: 88, site: 'sph', dx: 'Urinary sepsis, day 3', eligible: true },
    { id: 'I-5580', name: 'Victor N.', age: 81, site: 'msj', dx: 'Heart failure', eligible: false, reason: 'No caregiver at home' },
    { id: 'I-5592', name: 'Hana M.',   age: 66, site: 'vgh', dx: 'Pyelonephritis', eligible: false, reason: 'Outside catchment' },
  ];

  // patients waiting to go home who need Seniors Remote Monitoring to do so
  const srmCandidates = 4; // drawn from the 'home' group in the engine

  return {
    sites, portfolio, nodes, neighbourhoods, patients, personas, inpatients, srmCandidates, needMeta,
    occupiedAcute: 1948,
    costs: { alcDay: 1090, alcDayUpper: 2000, avgLos: 8.1 },
    reportCard: { alcShare: 0.111, alcTarget: 0.104, edWithin10h: 0.358, edTarget: 0.58 },
    contracts: [
      { name: 'Supported housing · Downtown South (operator A)', units: 40, occ90: 0.71, costNight: 120 },
      { name: 'Supported housing · Grandview (operator B)',      units: 32, occ90: 0.74, costNight: 120 },
    ],
    mismatches: { stepUp: 37, stepDown: 24 },
    abiOptions: [
      { id: 'A', name: 'Contracted secured beds', sub: 'Behavioural unit with an LTC operator', costNight: 460, maxBeds: 12, fits: 15, lead: '9–12 months', capex: 0 },
      { id: 'B', name: 'VCH small complex-care home', sub: '24-hour care aides, psychiatric nursing, psychiatry outreach', costNight: 620, maxBeds: 12, fits: 23, lead: '6–9 months', capex: 2400000 },
      { id: 'C', name: 'Enhanced supported housing', sub: 'Clinical outreach for lower-intensity needs', costNight: 290, maxBeds: 6, fits: 6, lead: '3 months', capex: 0 },
    ],
  };
})();
