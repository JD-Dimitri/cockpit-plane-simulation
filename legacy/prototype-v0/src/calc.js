/* =====================================================================
   CALCULS DU VOL : chaque carte = formule + valeurs (en direct ou saisies) + résultat
   ===================================================================== */
const r1 = (v, d) => Number.isFinite(v) ? v.toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }) : '—';
const liveRem = () => S.nav ? S.nav.rem / NM : S.fms.totalDist / NM;
const liveGs = () => Math.max(1, S.ac.V * Math.cos(S.ac.gam) / KT);
const CALCS = [
  { id: 'gc', t: 'Distance orthodromique et cap', f: 'd = 2R·asin(√(sin²(Δφ/2) + cos φ1·cos φ2·sin²(Δλ/2)))   ·   cap = atan2(sin Δλ·cos φ2, cos φ1·sin φ2 − sin φ1·cos φ2·cos Δλ)',
    why: 'Le plus court chemin entre deux points de la Terre est un arc de grand cercle (formule de haversine). Le cap change tout au long du vol : c\'est pourquoi la route vers Paris part vers le nord-ouest puis s\'incurve.',
    in: [{ k: 'la1', l: 'Latitude départ', u: '°', live: () => S.ac.lat }, { k: 'lo1', l: 'Longitude départ', u: '°', live: () => S.ac.lon }, { k: 'la2', l: 'Latitude arrivée', u: '°', live: () => AIRPORTS[S.fms.to].lat }, { k: 'lo2', l: 'Longitude arrivée', u: '°', live: () => AIRPORTS[S.fms.to].lon }],
    out: v => { const d = gcDist(v.la1, v.lo1, v.la2, v.lo2); return [['Distance', r1(d / NM) + ' NM'], ['soit', r1(d / 1000) + ' km'], ['Cap initial vrai', r1(gcBrg(v.la1, v.lo1, v.la2, v.lo2)) + '°']]; } },
  { id: 'eta', t: 'Temps de vol et heure d\'arrivée', f: 't = distance ÷ vitesse sol',
    why: 'Sans vent, vitesse sol = vitesse vraie. Avec un vent de face, la vitesse sol baisse et le vol s\'allonge : c\'est l\'une des raisons pour lesquelles un aller et son retour n\'ont pas toujours la même durée.',
    in: [{ k: 'd', l: 'Distance', u: 'NM', live: liveRem }, { k: 'gs', l: 'Vitesse sol', u: 'kt', live: () => S.ac.onGround ? 488 : liveGs() }],
    out: v => { const h = v.d / v.gs; return [['Temps', hhmm(h)], ['Arrivée', utcStr(simUtc() + h * 3600e3) + ' UTC']]; } },
  { id: 'fuel', t: 'Carburant nécessaire (bloc)', f: 'trajet = conso × temps · réserve route = 5 % · finale = 30 min · bloc = roulage + trajet + réserves + dégagement',
    why: 'La réglementation impose de partir avec de quoi aller à destination, faire face aux imprévus (5 %), rejoindre un aéroport de dégagement, puis tenir encore 30 minutes en attente.',
    in: [{ k: 'd', l: 'Distance', u: 'NM', live: liveRem }, { k: 'gs', l: 'Vitesse sol', u: 'kt', v: 488 }, { k: 'ff', l: 'Consommation', u: 'kg/h', live: () => S.ac.onGround ? 6200 : S.eng[0].ff + S.eng[1].ff }, { k: 'alt', l: 'Dégagement', u: 'kg', v: 3600 }, { k: 'taxi', l: 'Roulage', u: 'kg', v: 700 }],
    out: v => { const trip = v.ff * v.d / v.gs, rsv = trip * 0.05, fin = v.ff * 0.5 * 0.9, blk = v.taxi + trip + rsv + v.alt + fin; return [['Trajet', r1(trip) + ' kg'], ['Réserve route', r1(rsv) + ' kg'], ['Réserve finale', r1(fin) + ' kg'], ['Bloc minimum', r1(blk) + ' kg']]; } },
  { id: 'mass', t: 'Masses au décollage et à l\'atterrissage', f: 'TOW = ZFW + carburant bloc − roulage · LW = TOW − carburant trajet',
    why: 'Chaque avion a des masses maximales : 283 t au décollage et 207 t à l\'atterrissage pour l\'A350-900. Un vol long-courrier part lourd et arrive léger.',
    in: [{ k: 'zfw', l: 'Masse sans carburant (ZFW)', u: 't', live: () => S.fms.zfw }, { k: 'blk', l: 'Carburant bloc', u: 't', live: () => S.fms.block }, { k: 'taxi', l: 'Roulage', u: 't', v: 0.7 }, { k: 'trip', l: 'Carburant trajet', u: 't', live: () => tripFuel(S.fms) / 1000 }],
    out: v => { const tow = v.zfw + v.blk - v.taxi, lw = tow - v.trip; return [['TOW', r1(tow, 1) + ' t' + (tow > 283 ? ' ⚠ > 283' : ' ✓')], ['LW', r1(lw, 1) + ' t' + (lw > 207 ? ' ⚠ > 207' : ' ✓')]]; } },
  { id: 'isa', t: 'Atmosphère standard (ISA)', f: 'T = 15 − 1,98 °C / 1000 ft (jusqu\'à 36 089 ft, puis −56,5 °C) · p = 1013,25·(T/288,15)^5,256 · ρ = p ÷ (287·T) · a = √(1,4·287·T)',
    why: 'Plus haut, l\'air est plus froid et moins dense : il porte moins, mais il freine moins aussi. Les moteurs, la portance et les vitesses en dépendent.',
    in: [{ k: 'h', l: 'Altitude', u: 'ft', live: () => S.ac.alt / FT }],
    out: v => { const A = isa(v.h * FT); return [['Température', r1(A.T - 273.15, 1) + ' °C'], ['Pression', r1(A.p / 100, 1) + ' hPa'], ['Densité', r1(A.rho, 3) + ' kg/m³ (' + r1(A.rho / RHO0 * 100) + ' %)'], ['Vitesse du son', r1(A.a / KT) + ' kt']]; } },
  { id: 'spd', t: 'Vitesse indiquée, vraie et Mach', f: 'TAS ≈ IAS × √(ρ0 ÷ ρ) · Mach = TAS ÷ vitesse du son',
    why: 'L\'anémomètre mesure la pression dynamique, donc une vitesse « indiquée » (IAS). En altitude, l\'air étant moins dense, l\'avion va en réalité beaucoup plus vite (TAS).',
    in: [{ k: 'ias', l: 'Vitesse indiquée IAS', u: 'kt', live: () => ias() }, { k: 'h', l: 'Altitude', u: 'ft', live: () => S.ac.alt / FT }],
    out: v => { const A = isa(v.h * FT), tas = v.ias * Math.sqrt(RHO0 / A.rho); return [['Vitesse vraie TAS', r1(tas) + ' kt'], ['soit', r1(tas * 1.852) + ' km/h'], ['Mach', r1(tas * KT / A.a, 3)]]; } },
  { id: 'vs', t: 'Vitesse de décrochage et vitesses de référence', f: 'Vs = √(2·m·g ÷ (ρ0·S·CLmax)) · V2 = 1,13·Vs · VLS = 1,23·Vs · VAPP = VLS + 5 kt',
    why: 'Sous Vs, l\'aile ne porte plus assez. Les vitesses opérationnelles gardent une marge. Plus l\'avion est lourd, ou moins les volets sont sortis, plus Vs est élevée.',
    in: [{ k: 'm', l: 'Masse', u: 't', live: () => S.ac.mass / 1000 }, { k: 'c', l: 'Configuration (0 à 4 = FULL)', u: '', live: () => Math.round(S.ctl.flapsLever), step: 1 }],
    out: v => { const c = clamp(Math.round(v.c), 0, 4), vs = vs1g(v.m * 1000, c); return [['Vs 1g', r1(vs) + ' kt'], ['V2', r1(vs * 1.13) + ' kt'], ['VLS', r1(vs * 1.23) + ' kt'], ['VAPP', r1(vs * 1.23 + 5) + ' kt'], ['CLmax', r1(AC.conf[c].clmax, 2)]]; } },
  { id: 'lift', t: 'Portance, traînée et finesse', f: 'L = ½·ρ·V²·S·CL = m·g·n · D = ½·ρ·V²·S·(CD0 + k·CL²) · finesse = L ÷ D · poussée en palier = D',
    why: 'En palier, la portance équilibre le poids et la poussée équilibre la traînée. La finesse (≈ 18 à 20 pour l\'A350) dit combien de mètres l\'avion parcourt en planant pour 1 m de hauteur perdue.',
    in: [{ k: 'm', l: 'Masse', u: 't', live: () => S.ac.mass / 1000 }, { k: 'ias', l: 'IAS', u: 'kt', live: () => Math.max(120, ias()) }, { k: 'h', l: 'Altitude', u: 'ft', live: () => S.ac.alt / FT }, { k: 'phi', l: 'Inclinaison', u: '°', live: () => Math.abs(S.ac.phi * R2D) }],
    out: v => { const A = isa(v.h * FT), tas = v.ias * KT * Math.sqrt(RHO0 / A.rho), q = 0.5 * A.rho * tas * tas, n = 1 / Math.cos(v.phi * D2R), CL = v.m * 1000 * G0 * n / (q * AC.S), CD = AC.CD0 + AC.k * CL * CL, D = q * AC.S * CD, al = (CL - AC.CL0) / AC.CLa * R2D;
      return [['Coefficient de portance CL', r1(CL, 3)], ['Incidence estimée', r1(al, 1) + '°'], ['Traînée', r1(D / 1000) + ' kN'], ['Finesse', r1(CL / CD, 1)], ['Poussée par moteur', r1(D / 2000) + ' kN']]; } },
  { id: 'desc', t: 'Planifier la descente', f: 'distance (NM) ≈ Δaltitude (ft) ÷ 1000 × 3 · taux de descente (ft/min) ≈ vitesse sol (kt) × 5 (pente 3°)',
    why: 'Règle du « 3 pour 1 » : 3 NM pour 1 000 ft. Sur une pente de 3°, le vario vaut environ 5 fois la vitesse sol : 140 kt en finale donnent environ 700 ft/min.',
    in: [{ k: 'h1', l: 'Altitude actuelle', u: 'ft', live: () => S.ac.alt / FT }, { k: 'h2', l: 'Altitude visée', u: 'ft', live: () => AIRPORTS[S.fms.to].elev + 50 }, { k: 'gs', l: 'Vitesse sol', u: 'kt', live: () => S.ac.onGround ? 300 : liveGs() }, { k: 'p', l: 'Pente', u: '°', v: 3 }],
    out: v => { const dh = Math.max(0, v.h1 - v.h2), dist = dh * FT / Math.tan(v.p * D2R) / NM, vs = v.gs * KT * Math.sin(v.p * D2R) / FT * 60; return [['Distance de descente', r1(dist) + ' NM'], ['Règle du 3 pour 1', r1(dh / 1000 * 3) + ' NM'], ['Taux de descente', r1(vs) + ' ft/min'], ['Durée', hhmm(dist / v.gs)]]; } },
  { id: 'turn', t: 'Virage', f: 'R = V² ÷ (g·tan φ) · taux de virage = g·tan φ ÷ V · facteur de charge n = 1 ÷ cos φ',
    why: 'À 25° d\'inclinaison (inclinaison habituelle du pilote auto), un avion à 480 kt décrit un cercle de plus de 25 km de diamètre. C\'est pour cela que le FMS anticipe les virages.',
    in: [{ k: 'tas', l: 'Vitesse vraie', u: 'kt', live: () => Math.max(100, S.ac.V / KT) }, { k: 'phi', l: 'Inclinaison', u: '°', v: 25 }],
    out: v => { const V = v.tas * KT, t = Math.tan(clamp(v.phi, 1, 80) * D2R), R = V * V / (G0 * t); return [['Rayon', r1(R / NM, 1) + ' NM (' + r1(R / 1000, 1) + ' km)'], ['Taux de virage', r1(G0 * t / V * R2D, 2) + ' °/s'], ['Demi-tour en', r1(180 / (G0 * t / V * R2D)) + ' s'], ['Facteur de charge', r1(1 / Math.cos(v.phi * D2R), 2) + ' g']]; } },
  { id: 'wind', t: 'Vent de face et de travers', f: 'face = V·cos(vent − piste) · travers = V·sin(vent − piste)',
    why: 'On décolle et on atterrit face au vent pour réduire la vitesse sol. La composante de travers est limitée (environ 38 kt démontrés sur A350).',
    in: [{ k: 'rwy', l: 'Cap de la piste', u: '°', live: () => rwyGeom(S.ac.onGround && !S.tookOff ? S.fms.from : S.fms.to, S.ac.onGround && !S.tookOff ? S.fms.depRwy : S.fms.arrRwy).hdg }, { k: 'wd', l: 'Direction du vent (d\'où il vient)', u: '°', v: 90 }, { k: 'ws', l: 'Force du vent', u: 'kt', v: 15 }],
    out: v => { const d = (v.wd - v.rwy) * D2R, h = v.ws * Math.cos(d), x = v.ws * Math.sin(d); return [[h >= 0 ? 'Vent de face' : 'Vent arrière', r1(Math.abs(h), 1) + ' kt'], ['Vent de travers', r1(Math.abs(x), 1) + ' kt ' + (x > 0 ? 'de droite' : x < 0 ? 'de gauche' : '')]]; } },
  { id: 'palt', t: 'Altitude pression et altitude densité', f: 'Alt pression = altitude + (1013 − QNH) × 27 ft · Alt densité ≈ Alt pression + 120 × (OAT − T ISA)',
    why: 'Par temps chaud ou en altitude, l\'air est moins dense : l\'avion « croit » être plus haut, il lui faut plus de piste et il monte moins bien. C\'est un point clé pour un décollage de La Réunion en été.',
    in: [{ k: 'elev', l: 'Altitude du terrain', u: 'ft', live: () => AIRPORTS[S.ac.onGround && !S.tookOff ? S.fms.from : S.fms.to].elev }, { k: 'qnh', l: 'QNH', u: 'hPa', live: () => S.efis.qnh }, { k: 'oat', l: 'Température extérieure', u: '°C', v: 30 }],
    out: v => { const pa = v.elev + (1013 - v.qnh) * 27, tisa = 15 - 1.98 * pa / 1000; return [['Altitude pression', r1(pa) + ' ft'], ['T ISA à ce niveau', r1(tisa, 1) + ' °C'], ['Altitude densité', r1(pa + 120 * (v.oat - tisa)) + ' ft']]; } },
  { id: 'endu', t: 'Autonomie et distance franchissable', f: 'autonomie = carburant ÷ consommation · distance = autonomie × vitesse sol',
    why: 'Le copilote fait régulièrement ce calcul en croisière pour vérifier que le carburant restant suffit, réserves comprises.',
    in: [{ k: 'fob', l: 'Carburant à bord', u: 'kg', live: () => fob() }, { k: 'ff', l: 'Consommation', u: 'kg/h', live: () => S.ac.onGround ? 6200 : S.eng[0].ff + S.eng[1].ff }, { k: 'gs', l: 'Vitesse sol', u: 'kt', live: () => S.ac.onGround ? 488 : liveGs() }],
    out: v => { const h = v.fob / Math.max(1, v.ff); return [['Autonomie', hhmm(h)], ['Distance franchissable', r1(h * v.gs) + ' NM'], ['Reste à parcourir', r1(liveRem()) + ' NM']]; } },
  { id: 'conv', t: 'Conversions aéronautiques', f: '1 kt = 1,852 km/h · 1 ft = 0,3048 m · 1 NM = 1,852 km · 1 kg = 2,2046 lb · 1 hPa = 0,02953 inHg · °F = °C × 9/5 + 32',
    why: 'L\'aviation mélange les unités : pieds pour l\'altitude, nœuds pour la vitesse, milles nautiques pour la distance, kilos ou livres pour le carburant.',
    in: [{ k: 'x', l: 'Valeur à convertir', u: '', v: 100 }],
    out: v => [['kt → km/h', r1(v.x * 1.852, 1)], ['ft → m', r1(v.x * 0.3048, 1)], ['NM → km', r1(v.x * 1.852, 1)], ['kg → lb', r1(v.x * 2.20462, 1)], ['hPa → inHg', r1(v.x * 0.02953, 2)], ['°C → °F', r1(v.x * 9 / 5 + 32, 1)]] },
];
function buildCalc() {
  const box = $('calcBody'); if (!box || box.dataset.built) return;
  box.dataset.built = '1';
  box.innerHTML = `<label class="clive"><input type="checkbox" id="calcLive" checked> Valeurs du vol en direct (décoche pour saisir tes propres valeurs)</label><div class="cgrid">` +
    CALCS.map(c => `<section class="ccard" id="cc-${c.id}"><h3>${c.t}</h3><p class="cf">${c.f}</p>
      <div class="cin">${c.in.map(i => `<label><span>${i.l}${i.u ? ' <i>' + i.u + '</i>' : ''}${i.live ? ' <b class="lv" title="valeur du vol">●</b>' : ''}</span><input type="number" step="${i.step || 'any'}" id="ci-${c.id}-${i.k}" value="${i.v != null ? i.v : ''}"></label>`).join('')}</div>
      <div class="cout" id="co-${c.id}"></div><p class="cw">${c.why}</p></section>`).join('') + '</div>';
  CALCS.forEach(c => c.in.forEach(i => $(`ci-${c.id}-${i.k}`).addEventListener('input', () => calcOne(c))));
  calcRefresh(true);
}
function calcOne(c) {
  const v = {}; c.in.forEach(i => v[i.k] = parseFloat($(`ci-${c.id}-${i.k}`).value));
  let rows; try { rows = c.in.some(i => !Number.isFinite(v[i.k])) ? [['', 'Complète les valeurs']] : c.out(v); } catch (e) { rows = [['', '—']]; }
  const h = rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  const o = $('co-' + c.id); if (o.innerHTML !== h) o.innerHTML = h;
}
function calcRefresh(force) {
  if (!$('calcBody') || VIEW !== 'calc') return;
  const live = $('calcLive') && $('calcLive').checked;
  CALCS.forEach(c => {
    if (live || force) c.in.forEach(i => { if (!i.live) return; const el = $(`ci-${c.id}-${i.k}`); if (document.activeElement === el) return; let val = i.live(); if (Number.isFinite(val)) { const d = /^l[ao]/.test(i.k) ? 3 : Math.abs(val) >= 50 ? 0 : 2; el.value = String(Math.round(val * 10 ** d) / 10 ** d); } });
    calcOne(c);
  });
}
