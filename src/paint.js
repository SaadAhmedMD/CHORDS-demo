/* ============================================================
   Painted surfaces. The map is a nocturne of Vancouver painted
   in brush strokes at load time: water in indigo, land in near
   black, the city as dabs of light. Everything is drawn once on
   an offscreen canvas and handed to CSS as an image, so the live
   layer on top (sites, places, matches) stays crisp.
   Coastlines are schematic.
   ============================================================ */
const MAP = { w: 600, h: 450, lonMin: -123.27, lonMax: -123.035, latMin: 49.147, latMax: 49.338 }; // vertical scale compressed
const px = (p) => [(p.lon - MAP.lonMin) / (MAP.lonMax - MAP.lonMin) * MAP.w, (MAP.latMax - p.lat) / (MAP.latMax - MAP.latMin) * MAP.h];

const Paint = (() => {
  // schematic land outlines, [lon, lat]
  const LAND = [
    // North Shore
    [[-123.27, 49.338], [-123.27, 49.333], [-123.23, 49.335], [-123.19, 49.327], [-123.155, 49.325], [-123.138, 49.317], [-123.115, 49.312],
     [-123.08, 49.308], [-123.05, 49.303], [-123.035, 49.300], [-123.035, 49.338]],
    // Vancouver and the Point Grey peninsula
    [[-123.035, 49.292], [-123.07, 49.289], [-123.10, 49.2885], [-123.118, 49.2915], [-123.128, 49.297], [-123.135, 49.310], [-123.143, 49.3125],
     [-123.152, 49.307], [-123.157, 49.298], [-123.147, 49.289], [-123.140, 49.279], [-123.125, 49.2738], [-123.108, 49.2728], [-123.108, 49.2702],
     [-123.125, 49.2698], [-123.138, 49.2715], [-123.148, 49.2765], [-123.158, 49.2735], [-123.185, 49.2725], [-123.205, 49.2745], [-123.235, 49.278],
     [-123.262, 49.2735], [-123.266, 49.262], [-123.262, 49.250], [-123.250, 49.238], [-123.225, 49.228], [-123.20, 49.220], [-123.17, 49.209],
     [-123.14, 49.203], [-123.10, 49.2025], [-123.06, 49.205], [-123.035, 49.207]],
    // Richmond and Sea Island
    [[-123.035, 49.196], [-123.08, 49.197], [-123.13, 49.198], [-123.16, 49.203], [-123.20, 49.201], [-123.212, 49.190], [-123.205, 49.170],
     [-123.20, 49.147], [-123.035, 49.147]],
  ];
  // parks stay dark: [lon, lat, radius in map px]
  const PARKS = [[-123.144, 49.302, 22], [-123.243, 49.256, 34], [-123.20, 49.335, 26]];
  // where the city is brightest: [lon, lat, weight, spread in map px]
  const GLOW = [[-123.119, 49.283, 1.0, 26], [-123.125, 49.263, 0.7, 34], [-123.09, 49.262, 0.5, 30], [-123.137, 49.168, 0.75, 30],
    [-123.076, 49.316, 0.6, 22], [-123.10, 49.281, 0.6, 22], [-123.155, 49.234, 0.3, 26], [-123.07, 49.24, 0.35, 40], [-123.13, 49.209, 0.3, 24],
    [-123.16, 49.268, 0.35, 26], [-123.247, 49.262, 0.3, 16]];

  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, j, r) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v + (r() - 0.5) * j)))).join(',')})`;

  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function dab(g, x, y, ang, len, w, col, alpha) {
    const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
    g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x + dx, y + dy); g.stroke();
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function map() {
    try {
      const K = 2, W = MAP.w * K, H = MAP.h * K;
      const c = canvas(W, H), g = c.getContext('2d'), r = mulberry32(1874);
      const polys = LAND.map((p) => p.map(([lon, lat]) => px({ lon, lat }).map((v) => v * K)));
      const parks = PARKS.map(([lon, lat, rad]) => [...px({ lon, lat }).map((v) => v * K), rad * K]);
      const glows = GLOW.map(([lon, lat, wt, s]) => [...px({ lon, lat }).map((v) => v * K), wt, s * K]);
      const onLand = (x, y) => polys.some((p) => inPoly(x, y, p));
      const inPark = (x, y) => parks.some(([cx, cy, rad]) => (x - cx) ** 2 + (y - cy) ** 2 < rad * rad);
      const glow = (x, y) => glows.reduce((a, [cx, cy, wt, s]) => a + wt * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s)), 0);
      const swell = (x, y) => 0.5 + 0.25 * Math.sin(x * 0.006 + 1.3) * Math.cos(y * 0.009 + 0.4) + 0.25 * Math.sin((x + y) * 0.004);

      g.fillStyle = '#152C52'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#0D121C';
      polys.forEach((p) => { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); });
      const waterLo = hex('#112646'), waterHi = hex('#2A5684'), landLo = hex('#0C1019'), landHi = hex('#1B202B'), park = hex('#0E1A17');
      // broad underpainting, then smaller strokes over it
      [[900, 46, 90, 16, 26, 0.9], [3000, 18, 44, 6, 11, 0.85], [1700, 8, 22, 3, 5.5, 0.6]].forEach(([n, l0, l1, w0, w1, a], layer) => {
        for (let i = 0; i < n; i++) {
          const x = r() * W, y = r() * H, land = onLand(x, y);
          if (land) {
            const col = inPark(x, y) ? park : mix(landLo, landHi, r() * 0.8 + 0.2 * Math.min(1, glow(x, y)));
            const ang = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.5;
            dab(g, x, y, ang, (l0 + r() * (l1 - l0)) * 0.7, w0 + r() * (w1 - w0), rgb(col, 10, r), a);
          } else {
            const t = Math.max(0, Math.min(1, swell(x, y) + (r() - 0.5) * 0.5 + (layer === 2 ? 0.25 : 0)));
            dab(g, x, y, (r() - 0.5) * 0.45, l0 + r() * (l1 - l0), w0 + r() * (w1 - w0), rgb(mix(waterLo, waterHi, t), 12, r), a);
          }
        }
      });
      // shoreline: pale strokes where water meets land
      polys.forEach((p) => {
        for (let i = 0; i < p.length; i++) {
          const a = p[i], b = p[(i + 1) % p.length];
          if ((a[0] > W - 2 && b[0] > W - 2) || (a[1] > H - 2 && b[1] > H - 2) || (a[1] < 2 && b[1] < 2) || (a[0] < 2 && b[0] < 2)) continue;
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          for (let d = 0; d < len; d += 9) {
            if (r() < 0.25) continue;
            const t = d / len;
            dab(g, a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 6, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 6, ang + (r() - 0.5) * 0.6, 10 + r() * 12, 2.5 + r() * 2, rgb(hex('#6F93BC'), 20, r), 0.32);
          }
        }
      });
      // the city: dabs of light, densest where people live and work
      const lights = ['#B98A45', '#D9A455', '#E9BC6E', '#A3742F', '#F3D699'];
      const lit = [];
      for (let i = 0; i < 6800; i++) {
        const x = r() * W, y = r() * H;
        if (!onLand(x, y) || inPark(x, y)) continue;
        const f = glow(x, y);
        if (r() > 0.06 + f * 0.8) continue;
        const ang = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.4;
        dab(g, x, y, ang, 3 + r() * 6, 2 + r() * 2.6, lights[Math.floor(r() * lights.length)], 0.3 + Math.min(0.52, f * 0.5) + r() * 0.12);
        if (f > 0.25) lit.push([x, y, f]);
      }
      // light carried onto the water
      for (let i = 0; i < 700 && lit.length; i++) {
        const [x, y, f] = lit[Math.floor(r() * lit.length)];
        const dir = r() < 0.5 ? -1 : 1, dist = 10 + r() * 46, yy = y + dir * dist, xx = x + (r() - 0.5) * 8;
        if (yy < 0 || yy > H || onLand(xx, yy)) continue;
        dab(g, xx, yy, Math.PI / 2 + (r() - 0.5) * 0.2, 8 + r() * 16, 2 + r() * 2, lights[Math.floor(r() * 3)], 0.10 + f * 0.16);
      }
      // quiet the edges
      const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
      v.addColorStop(0, 'rgba(6,10,18,0)'); v.addColorStop(1, 'rgba(6,10,18,0.55)');
      g.globalAlpha = 1; g.fillStyle = v; g.fillRect(0, 0, W, H);
      return c.toDataURL('image/jpeg', 0.86);
    } catch (e) { return ''; }
  }

  // loose diagonal strokes for the page ground and the closing card
  function ground(w, h, seed, flecks, where, dim = 1) {
    try {
      const c = canvas(w, h), g = c.getContext('2d'), r = mulberry32(seed);
      g.fillStyle = '#0C1422'; g.fillRect(0, 0, w, h);
      const lo = hex('#0B1220'), hi = hex('#182A49');
      for (let i = 0; i < 1100; i++) {
        const x = r() * w, y = r() * h, t = Math.pow(r(), 1.8);
        dab(g, x, y, -0.42 + (r() - 0.5) * 0.5, 50 + r() * 130, 12 + r() * 26, rgb(mix(lo, hi, t), 8, r), 0.5);
      }
      const warm = ['#B98A45', '#E3A857', '#F2C97A'];
      for (let i = 0; i < flecks * 6; i++) {
        const x = r() * w, y = r() * h;
        const d = where(x / w, y / h);
        if (r() > d) continue;
        dab(g, x, y, -0.42 + (r() - 0.5) * 0.7, 4 + r() * 12, 1.6 + r() * 2.6, warm[Math.floor(Math.pow(r(), 1.5) * warm.length)], (0.1 + d * 0.5 * r()) * dim);
      }
      return c.toDataURL('image/jpeg', 0.82);
    } catch (e) { return ''; }
  }

  function install() {
    const root = document.documentElement.style;
    const set = (k, url) => { if (url) root.setProperty(k, `url(${url})`); };
    set('--map-art', map());
    set('--page-art', ground(960, 600, 77, 50, (x, y) => Math.max(0, 1 - Math.hypot(x - 0.95, y - 0.02) * 2.6), 0.45));
    set('--ember-art', ground(960, 380, 301, 420, (x, y) => Math.max(0, 1 - Math.hypot((x - 0.72) * 1.1, (y - 0.78) * 2.4) * 1.5)));
  }
  return { install };
})();

