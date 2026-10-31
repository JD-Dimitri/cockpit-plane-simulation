/* =====================================================================
   RELIEF ET VUE EXTÉRIEURE 3D (Three.js)
   Données : altitude et image satellite NASA Blue Marble (domaine public),
   recadrées sur le couloir Réunion – Paris (≈ 10 km par pixel).
   ===================================================================== */
const T3 = { ok: false, hReady: false, H: null, O: null, R: 0, lastAlt: -1e9, aps: [] };
const T3_K = 90, T3_M = 160;            // anneaux et secteurs du maillage polaire
const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* Altitude brute (m) lue dans la carte, interpolation bilinéaire. Mer = 0. */
function terrainRaw(lat, lon) {
  if (!T3.hReady) return 0;
  const M = TERRAIN_META;
  const fx = (lon - M.lon0) / (M.lon1 - M.lon0) * (M.w - 1), fy = (M.lat1 - lat) / (M.lat1 - M.lat0) * (M.h - 1);
  if (fx < 0 || fy < 0 || fx >= M.w - 1 || fy >= M.h - 1) return 0;
  const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, w = M.w, H = T3.H;
  const a = H[y0 * w + x0], b = H[y0 * w + x0 + 1], c = H[(y0 + 1) * w + x0], d = H[(y0 + 1) * w + x0 + 1];
  return ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) * M.k;
}
/* Altitude du sol (m) : relief réel, aplani à l'altitude de l'aéroport dans un rayon de 6 km, raccordé jusqu'à 15 km */
function surfaceElev(lat, lon) {
  let h = terrainRaw(lat, lon);
  for (const k in AIRPORTS) {
    const ap = AIRPORTS[k];
    if (Math.abs(lat - ap.lat) > 0.2 || Math.abs(lon - ap.lon) > 0.25) continue;
    const d = gcDist(lat, lon, ap.lat, ap.lon);
    if (d < 15000) { const w = smooth01(6000, 15000, d); h = ap.elev * FT * (1 - w) + h * w; }
  }
  return h;
}

function t3LoadHeights() {
  if (typeof TERRAIN_H === 'undefined') return;
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data, H = new Uint8Array(c.width * c.height);
      for (let i = 0; i < H.length; i++) H[i] = d[i * 4];
      T3.H = H; T3.hReady = true; T3.lastAlt = -1e9;
    } catch (e) { T3.hReady = false; }
  };
  img.src = TERRAIN_H;
}

/* ---------- géométrie des aéroports (pistes, marquages, feux) ---------- */
function t3Airport(ap) {
  const g = new THREE.Group();
  const el = ap.elev * FT;
  const bufs = {};
  const quad = (key, pts, z) => {           // pts : 4 × [est, nord] en mètres autour du point de référence
    const b = bufs[key] || (bufs[key] = []);
    const v = pts.map(p => [p[0], el + z, -p[1]]);
    b.push(...v[0], ...v[1], ...v[2], ...v[0], ...v[2], ...v[3]);
  };
  const pts = { white: [], appr: [], edge: [] };
  const papis = [];
  Object.keys(ap.rwys).forEach((id, ri) => {
    const r = rwyGeom(ap.icao, id); if (ri > 0) return;     // une seule bande par aéroport (deux QFU)
    const T = enu(ap.lat, ap.lon, r.thr.lat, r.thr.lon), h = r.hdg * D2R;
    const ux = Math.sin(h), uy = Math.cos(h), vx = Math.cos(h), vy = -Math.sin(h);
    const P = (al, sd) => [T.e + ux * al + vx * sd, T.n + uy * al + vy * sd];
    quad('asph', [P(-60, -30), P(r.len + 60, -30), P(r.len + 60, 30), P(-60, 30)], 0.25);
    quad('apron', [P(-90, -300), P(r.len + 90, -300), P(r.len + 90, -190), P(-90, -190)], 0.18);   // taxiway parallèle
    for (const cAl of [45, r.len / 2, r.len - 45]) {                       // bretelles taxiway ↔ piste
      quad('apron', [P(cAl - 25, -260), P(cAl + 25, -260), P(cAl + 25, -30), P(cAl - 25, -30)], 0.18);
      quad('yellow', [P(cAl - 1, -245), P(cAl + 1, -245), P(cAl + 1, -30), P(cAl - 1, -30)], 0.3);
    }
    quad('apron', [P(r.len / 2 - 30, -340), P(r.len / 2 + 30, -340), P(r.len / 2 + 30, -190), P(r.len / 2 - 30, -190)], 0.18);
    // aérogare et tour de contrôle face au poste de stationnement
    const bmat = new THREE.MeshLambertMaterial({ color: 0xc9ccd0 }), glass = new THREE.MeshLambertMaterial({ color: 0x5d7a92 });
    const tp = P(r.len / 2, -640), term = new THREE.Mesh(new THREE.BoxGeometry(520, 24, 90), bmat);
    term.position.set(tp[0], el + 12, -tp[1]); term.rotation.y = Math.PI / 2 - h; g.add(term);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(522, 8, 92), glass); gl.position.set(tp[0], el + 15, -tp[1]); gl.rotation.y = term.rotation.y; g.add(gl);
    const jb = P(r.len / 2, -545), bridge = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 110), bmat);
    bridge.position.set(jb[0], el + 6, -jb[1]); bridge.rotation.y = term.rotation.y; g.add(bridge);
    const tw = P(r.len / 2 + 380, -600), tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 60, 12), bmat);
    tower.position.set(tw[0], el + 30, -tw[1]); g.add(tower);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(11, 9, 9, 12), glass); cab.position.set(tw[0], el + 63, -tw[1]); g.add(cab);
    quad('yellow', [P(r.len / 2 - 1, -400), P(r.len / 2 + 1, -400), P(r.len / 2 + 1, -245), P(r.len / 2 - 1, -245)], 0.3);
    const gate = enu(ap.lat, ap.lon, gcDest(ap.lat, ap.lon, r.hdg - 90, 420).lat, gcDest(ap.lat, ap.lon, r.hdg - 90, 420).lon);
    const G = (al, sd) => [gate.e + ux * al + vx * sd, gate.n + uy * al + vy * sd];
    quad('apron', [G(-300, -140), G(300, -140), G(300, 90), G(-300, 90)], 0.15);
    for (let d = 60; d < r.len - 60; d += 60) quad('white', [P(d, -0.6), P(d + 30, -0.6), P(d + 30, 0.6), P(d, 0.6)], 0.35);
    for (const end of [0, 1]) {
      const al0 = end ? r.len - 6 : 6, s = end ? -1 : 1;
      for (let k = -6; k <= 6; k++) if (k) quad('white', [P(al0, k * 4 - 1), P(al0 + s * 44, k * 4 - 1), P(al0 + s * 44, k * 4 + 1), P(al0, k * 4 + 1)], 0.35);
      const tz = end ? r.len - 330 : 300;
      quad('white', [P(tz, -10), P(tz + 60, -10), P(tz + 60, -4), P(tz, -4)], 0.35); quad('white', [P(tz, 4), P(tz + 60, 4), P(tz + 60, 10), P(tz, 10)], 0.35);
    }
    quad('yellow', [P(-80, -246), P(r.len + 80, -246), P(r.len + 80, -244), P(-80, -244)], 0.3);
    for (let d = 0; d <= r.len; d += 60) for (const sd of [-31, 31]) pts.edge.push(...P(d, sd));
    for (const end of [0, 1]) for (let d = 60; d <= 900; d += 30) { const al = end ? r.len + d : -d; for (const sd of (d % 150 === 0 ? [-12, -6, 0, 6, 12] : [0])) pts.appr.push(...P(al, sd)); }
    [2.5, 2.83, 3.17, 3.5].forEach((ang, k) => papis.push({ p: P(330, -48 - k * 9), ang, thr: r.thr, elev: r.elev }));
  });
  const mats = { asph: 0x3a3d40, apron: 0x6c7175, white: 0xe9e9e9, yellow: 0xe0b81c };
  for (const key in bufs) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(bufs[key], 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: mats[key], fog: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })));
  }
  const ptsObj = (arr, color, size) => {
    const v = []; for (let i = 0; i < arr.length; i += 2) v.push(arr[i], el + 1.2, -arr[i + 1]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, fog: false }));
  };
  g.add(ptsObj(pts.edge, 0xfff3d6, 2.2)); g.add(ptsObj(pts.appr, 0xfff9e8, 2.6));
  const papiObjs = papis.map(pp => { const o = ptsObj(pp.p, 0xffffff, 3.5); g.add(o); return { o, ...pp }; });
  return { ap, g, papis: papiObjs };
}

/* ---------- initialisation ---------- */
function t3Init() {
  t3LoadHeights();
  if (!window.THREE) return;
  try {
    const cv = $('cvWin3d');
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, logarithmicDepthBuffer: true });
    r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1)); r.setSize(1280, 320, false);
    r.outputEncoding = THREE.sRGBEncoding;
    const sc = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 1280 / 320, 1.5, 1.6e6); cam.rotation.order = 'YXZ';
    sc.add(new THREE.HemisphereLight(0xe2f0ff, 0x5c5646, 0.85));
    const sun = new THREE.DirectionalLight(0xfff2dc, 0.85); sun.position.set(0.35, 1, 0.25); sc.add(sun);
    sc.fog = new THREE.Fog(0xbfd6ea, 1, 2);
    // ciel : dôme en dégradé
    const skyGeo = new THREE.SphereGeometry(1.4e6, 32, 16), cols = [];
    const p = skyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) cols.push(1, 1, 1);
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sc.add(sky);
    // terrain : maillage polaire, plus dense près de l'avion
    const n = 1 + T3_K * T3_M;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const idx = [];
    for (let j = 0; j < T3_M; j++) idx.push(0, 1 + (j + 1) % T3_M, 1 + j);          // faces orientées vers le haut
    for (let k = 1; k < T3_K; k++) for (let j = 0; j < T3_M; j++) {
      const a = 1 + (k - 1) * T3_M + j, b = 1 + (k - 1) * T3_M + (j + 1) % T3_M, c = 1 + k * T3_M + j, d = 1 + k * T3_M + (j + 1) % T3_M;
      idx.push(a, b, c, b, d, c);
    }
    geo.setIndex(idx);
    const tex = new THREE.TextureLoader().load(TERRAIN_C);
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    sc.add(mesh);
    Object.assign(T3, { r, sc, cam, sky, geo, mesh, ok: true });
    T3.aps = Object.values(AIRPORTS).map(ap => { const o = t3Airport(ap); sc.add(o.g); return o; });
  } catch (e) { T3.ok = false; }
}

function t3Rebuild() {
  const a = S.ac, M = TERRAIN_META;
  const Rm = clamp(Math.sqrt(2 * RE * Math.max(a.alt, 30)) * 1.3 + 25000, 60000, 600000);
  T3.O = { lat: a.lat, lon: a.lon }; T3.R = Rm; T3.lastAlt = a.alt;
  const pos = T3.geo.attributes.position.array, uv = T3.geo.attributes.uv.array, cl = Math.cos(a.lat * D2R);
  let p = 0, q = 0;
  const put = (e, nn) => {
    const lat = a.lat + nn / RE * R2D, lon = a.lon + e / (RE * cl) * R2D;
    pos[p++] = e; pos[p++] = surfaceElev(lat, lon) - (e * e + nn * nn) / (2 * RE); pos[p++] = -nn;
    uv[q++] = (lon - M.lon0) / (M.lon1 - M.lon0); uv[q++] = (lat - M.lat0) / (M.lat1 - M.lat0);
  };
  put(0, 0);
  for (let k = 1; k <= T3_K; k++) {
    const rr = Rm * Math.pow(k / T3_K, 1.9);
    for (let j = 0; j < T3_M; j++) { const an = j / T3_M * Math.PI * 2; put(rr * Math.sin(an), rr * Math.cos(an)); }
  }
  T3.geo.attributes.position.needsUpdate = true; T3.geo.attributes.uv.needsUpdate = true;
  T3.geo.computeVertexNormals(); T3.geo.computeBoundingSphere();
}

/* Rendu d'une image. Renvoie false si la 3D n'est pas disponible (on garde alors la vue 2D). */
function t3Render() {
  if (!T3.ok) return false;
  const a = S.ac;
  const moved = T3.O ? gcDist(T3.O.lat, T3.O.lon, a.lat, a.lon) : 1e12;
  if (moved > T3.R * 0.03 || Math.abs(a.alt - T3.lastAlt) > Math.max(250, a.alt * 0.12)) t3Rebuild();
  const off = enu(a.lat, a.lon, T3.O.lat, T3.O.lon);
  T3.mesh.position.set(off.e, 0, -off.n);
  const cam = T3.cam;
  cam.position.set(0, a.alt + 8.5, 0);
  cam.rotation.set(a.theta - 7 * D2R, -a.psi, -a.phi, 'YXZ');   // regard du pilote : environ 7° sous l'axe de l'avion
  T3.sky.position.copy(cam.position);
  // ciel et brume selon l'altitude
  const hi = clamp(a.alt / 12000, 0, 1);
  const zen = new THREE.Color().setRGB(lerp(0.23, 0.04, hi), lerp(0.47, 0.17, hi), lerp(0.82, 0.48, hi));
  const hor = new THREE.Color().setRGB(lerp(0.78, 0.70, hi), lerp(0.86, 0.80, hi), lerp(0.93, 0.92, hi));
  const sp = T3.sky.geometry.attributes.position, sc = T3.sky.geometry.attributes.color;
  if (T3.skyHi !== Math.round(hi * 50)) {
    T3.skyHi = Math.round(hi * 50);
    for (let i = 0; i < sp.count; i++) { const y = sp.getY(i) / 1.4e6, t = clamp(y * 3.2, 0, 1); const c = hor.clone().lerp(zen, Math.sqrt(t)); if (y < 0) c.copy(hor); sc.setXYZ(i, c.r, c.g, c.b); }
    sc.needsUpdate = true;
  }
  T3.sc.fog.color.copy(hor); T3.sc.fog.near = T3.R * 0.18; T3.sc.fog.far = T3.R * 0.98;
  // aéroports et PAPI
  T3.aps.forEach(o => {
    const d = gcDist(a.lat, a.lon, o.ap.lat, o.ap.lon); o.g.visible = d < 70000;
    if (!o.g.visible) return;
    const p = enu(a.lat, a.lon, o.ap.lat, o.ap.lon); o.g.position.set(p.e, -(d * d) / (2 * RE), -p.n);
    o.papis.forEach(pp => { const gl = Math.atan2(a.alt - pp.elev, Math.max(1, gcDist(a.lat, a.lon, pp.thr.lat, pp.thr.lon))) * R2D; pp.o.material.color.setHex(gl > pp.ang ? 0xffffff : 0xff2a2a); });
  });
  T3.r.render(T3.sc, cam);
  return true;
}
