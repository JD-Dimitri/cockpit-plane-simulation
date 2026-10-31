/* =====================================================================
   MODE PÉDAGOGIQUE : bulle numérotée posée sur la commande à utiliser
   + SONS (Web Audio, générés dans la page)
   ===================================================================== */
const TUT = { on: false, view: null, last: -1, flashT: 0, scrolledFor: -1 };
const isCoarse = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const pct = v => Math.round(v * 100) + ' %';
/* Pour chaque étape du guide : cibles à entourer, explication (« pourquoi »), progression */
const TUT_X = [
  { e: ['ctl-bat1', 'ctl-batEmer1', 'ctl-batEmer2', 'ctl-bat2'], w: 'Les batteries alimentent le réseau continu (DC) : voyants du plafonnier et instrument de secours. Sans elles, rien ne s\'allume.' },
  { e: ['ctl-extA'], w: 'Le groupe de parc fournit le courant alternatif (230 V, 400 Hz). Il alimente les grands écrans tant que les moteurs sont arrêtés.' },
  { e: ['ctl-adr1', 'ctl-adr2', 'ctl-adr3', 'ctl-ir1', 'ctl-ir2', 'ctl-ir3'], w: 'Chaque ADIRS réunit une centrale inertielle (IR : gyroscopes et accéléromètres → assiette, cap, position) et une centrale anémométrique (ADR : sondes Pitot et statiques → vitesse, altitude). L\'avion doit rester immobile pendant l\'alignement.', p: () => 'Alignement : ' + pct(Math.min(...S.sys.adirs)) },
  { e: ['ctl-navLogo'], w: 'Feu rouge à gauche, vert à droite, blanc à l\'arrière : les autres savent où est l\'avion et dans quel sens il va.' },
  { e: ['ctl-apuMaster', 'ctl-apuStart'], w: 'L\'APU est une petite turbine dans la queue. Elle produit électricité et air comprimé quand les moteurs sont arrêtés.', p: () => 'APU : N ' + Math.round(S.sys.apu.n) + ' % · EGT ' + Math.round(S.sys.apu.egt) + ' °C' },
  { e: ['ctl-apuBleed'], w: 'Le démarreur des moteurs est une turbine à air : il lui faut de l\'air sous pression, environ 40 PSI.' },
  { e: ['[data-mf="init"]'], w: 'Le FMS trace la route orthodromique (le plus court chemin sur la sphère terrestre) et la découpe en points de passage.' },
  { e: ['[data-mf="fuel"]'], w: 'Le carburant pèse près d\'un tiers de la masse au décollage. Le FMS additionne trajet, réserve de route (5 %), dégagement et 30 min de réserve finale.' },
  { e: ['[data-mf="perf"]'], w: 'V1 : au-delà, on décolle même en cas de panne. VR : on cabre. V2 : vitesse de sécurité en montée, même avec un moteur en panne.' },
  { e: ['fcuAlt'], w: 'L\'altitude du FCU est une limite que le pilote auto ne dépassera pas : c\'est l\'altitude autorisée par le contrôle aérien.' },
  { e: ['ctl-seatBelts', 'ctl-noSmoking'], w: 'Ces consignes s\'allument en cabine. Elles restent sur ON au roulage, au décollage et à l\'atterrissage.' },
  { e: ['ctl-beacon'], w: 'Le feu rouge clignotant prévient le personnel au sol : les moteurs vont démarrer, il faut s\'éloigner.' },
  { e: ['engModeDisp'], w: 'IGN START lance la séquence automatique : le FADEC (calculateur moteur) ouvre le démarreur, injecte le carburant et allume au bon moment.' },
  { e: ['master2'], w: 'Le Trent XWB a trois arbres : N1, N2, N3. Le démarreur entraîne N3. Vers 25 %, le carburant s\'enflamme et l\'EGT monte. Le moteur se stabilise au ralenti vers 68 %.', p: () => 'Moteur 2 : N3 ' + Math.round(S.eng[1].n3) + ' % · EGT ' + Math.round(S.eng[1].egt) + ' °C' },
  { e: ['master1'], w: 'Même séquence pour le moteur 1. Regarde la page ENG de l\'écran systèmes (SD) pendant le démarrage.', p: () => 'Moteur 1 : N3 ' + Math.round(S.eng[0].n3) + ' % · EGT ' + Math.round(S.eng[0].egt) + ' °C' },
  { e: ['engModeDisp'], w: 'En NORM, l\'allumage se réactive tout seul si un moteur s\'éteint en vol.' },
  { e: ['ctl-apuBleed', 'ctl-apuMaster', 'ctl-extA'], w: 'Les générateurs et le prélèvement d\'air des moteurs prennent le relais. Couper l\'APU économise environ 140 kg de carburant par heure.' },
  { e: ['flapSteps'], w: 'Les becs et volets augmentent la portance à basse vitesse : l\'avion décolle plus lentement, donc sur une piste plus courte.' },
  { e: ['spdbrkSteps'], w: 'Armés, les spoilers sortent seuls au toucher des roues ou si le décollage est interrompu. Ils annulent la portance pour que les freins mordent mieux.' },
  { e: ['abBtns'], w: 'RTO = décollage interrompu. Si les manettes reviennent au ralenti au-dessus de 72 kt, le freinage est automatiquement maximal.' },
  { e: ['ctl-nose', 'ctl-strobe'], w: 'Le phare de roulage éclaire le sol devant l\'avion. En AUTO, les stroboscopes s\'allumeront dès que l\'avion quittera le sol.' },
  { e: ['ecpBtns'], w: 'Le test vérifie volets, aérofreins et frein de parking. Décoller mal configuré est une cause classique d\'accident.' },
  { e: ['tbAutoTaxi', 'tiller'], w: 'Au sol, on dirige l\'avion avec le volant de la roulette de nez (tiller). Un A350 lourd démarre avec un petit filet de gaz, puis roule presque au ralenti. Le ND en 2 NM affiche le plan de l\'aéroport et ton trajet en magenta.', p: () => { const r = rwyGeom(S.fms.from, S.fms.depRwy); return 'Seuil à ' + Math.round(gcDist(S.ac.lat, S.ac.lon, r.thr.lat, r.thr.lon)) + ' m'; } },
  { e: ['parkBtn'], w: 'Le frein de parking bloque les roues. Il doit être desserré avant de mettre les gaz, sinon l\'ECAM déclenche une alarme.' },
  { e: ['ctl-land', 'ctl-nose', 'ctl-strobe'], w: 'Phares et stroboscopes rendent l\'avion visible pendant la phase la plus chargée du vol.' },
  { e: ['thrTrack'], w: 'FLX : poussée réduite calculée pour une température fictive (50 °C). Les moteurs s\'usent moins et la piste reste suffisante.', t: ['[data-act="tla-up"]'] },
  { e: ['stickPad'], t: ['stickPad2'], w: 'Vise 10° d\'assiette en environ 4 secondes. Trop fort : la queue touche la piste (au-delà de 11,5°). Trop tard : l\'avion part seul à grande vitesse, mal contrôlé. Sur téléphone, glisse le manche vers le BAS pour cabrer.', p: () => 'Vitesse ' + Math.round(ias()) + ' kt · VR ' + S.fms.vr + ' kt · assiette ' + (S.ac.theta * R2D).toFixed(1) + '°' },
  { e: ['gearLever'], t: ['tbGear'], w: 'Le train sorti crée beaucoup de traînée. On le rentre dès que le vario est positif et confirmé.', p: () => 'Vario ' + Math.round(S.ac.vs / FT * 60) + ' ft/min' },
  { e: ['thrTrack'], t: ['[data-act="tla-dn"]'], w: 'À 1 500 ft, LVR CLB clignote sur le PFD : on passe en poussée de montée (CL). Les manettes restent ensuite dans ce cran et l\'A/THR gère la poussée.', p: () => 'Hauteur ' + Math.round(radAlt()) + ' ft · réduction à ' + S.fms.thrRed + ' ft' },
  { e: ['pbAP1'], t: ['tbAP'], w: 'Au-dessus de 100 ft, le pilote auto suit les modes affichés en haut du PFD (le FMA). Ici : SRS ou CLB en vertical, NAV en latéral.' },
  { e: ['flapSteps'], t: ['[data-act="flap-"]'], w: 'On rentre les volets en accélérant. Chaque cran a une vitesse maximale, visible sur la bande rouge et noire du PFD.', p: () => 'Vitesse ' + Math.round(ias()) + ' kt' },
  { e: ['fcuAlt'], w: 'PUSH = mode géré : le FMS décide (un point s\'affiche). PULL = mode sélecté : c\'est toi qui décides.' },
  { e: ['baroDisp'], w: 'Au-dessus de l\'altitude de transition, tous les avions règlent 1013 hPa. Ils volent en niveaux de vol (FL) et restent séparés même quand la pression locale change.' },
  { e: ['ctl-land', 'ctl-nose', 'ctl-rwyTurn'], w: 'Au-dessus de 10 000 ft, les phares ne servent plus et la vitesse dépasse 250 kt.' },
  { e: ['rateUp'], w: 'Le vol dure environ 11 h ; à ×256, il ne prend que quelques minutes. L\'avion s\'allège d\'environ 6 t par heure. Surveille la page FUEL.', p: () => S.nav ? 'Reste ' + Math.round(S.nav.rem / NM) + ' NM · ×' + S.rate : '' },
  { e: ['fcuAlt'], w: 'Le T/D (début de descente) se place environ 125 NM avant l\'arrivée : on parcourt environ 3 NM pour chaque 1 000 ft perdus.', p: () => { const td = todRemaining(); return S.nav && td ? 'T/D dans ' + Math.max(0, Math.round((S.nav.rem - td) / NM)) + ' NM' : ''; } },
  { e: ['baroDisp'], w: 'Sous le niveau de transition, on revient à la pression locale (QNH) pour lire l\'altitude réelle au-dessus de la mer.' },
  { e: ['pbLS', 'pbAPPR'], w: 'L\'ILS émet deux faisceaux : le LOC (axe de piste) et le G/S (pente de 3°). Les losanges magenta du PFD montrent l\'écart.' },
  { e: ['pbAP2'], w: 'Deux pilotes auto qui se surveillent l\'un l\'autre donnent CAT 3 DUAL : l\'atterrissage reste possible presque sans visibilité.' },
  { e: ['flapSteps'], t: ['[data-act="flap+"]'], w: 'On sort les volets en ralentissant, au repère vert (point) puis S. Chaque cran baisse la vitesse minimale.', p: () => 'Vitesse ' + Math.round(ias()) + ' kt' },
  { e: ['gearLever'], t: ['tbGear'], w: 'Train sorti avant 1 000 ft au plus tard. Les trois triangles verts confirment qu\'il est verrouillé.' },
  { e: ['flapSteps'], t: ['[data-act="flap+"]'], w: 'FULL donne la vitesse d\'approche la plus basse (VAPP) et la meilleure visibilité de la piste.' },
  { e: ['spdbrkSteps', 'abBtns'], w: 'Spoilers armés et freins auto réglés : l\'avion freinera tout seul dès le toucher des roues.' },
  { e: ['thrTrack'], t: ['[data-act="tla-dn"]', '[data-act="tb-rev"]'], w: 'À 10 ft, l\'annonce RETARD demande de réduire. Une fois au sol, les inverseurs dévient le flux d\'air vers l\'avant pour freiner.', p: () => S.ac.onGround ? 'Au sol · ' + Math.round(ias()) + ' kt' : 'Hauteur ' + Math.round(radAlt()) + ' ft' },
  { e: ['flapSteps', 'spdbrkSteps'], w: 'Sous 70 kt, on nettoie l\'avion : volets rentrés, spoilers désarmés, manettes au ralenti.' },
  { e: ['tbAutoTaxi', 'tiller'], w: 'Sous 30 kt, on dégage par la bretelle suivante puis on suit le taxiway jusqu\'au poste de stationnement. Le trajet apparaît en magenta sur le ND.', p: () => (typeof taxiLine === 'function' ? taxiLine() : '') },
  { e: ['parkBtn', 'master1', 'master2'], w: 'Frein de parking, moteurs coupés, puis BEACON sur OFF : le personnel au sol peut approcher. Vol terminé.' },
];

function tutorTargets(i) {
  const x = TUT_X[i] || {}, coarse = isCoarse();
  const ids = (coarse && x.t) ? x.t : (x.e || [STEPS[i].e]);
  const pick = list => list.map(id => { try { return /^[#\[.]/.test(id) ? document.querySelector(id) : $(id); } catch (e) { return null; } }).filter(el => el && el.offsetParent !== null);
  const r = pick(ids);
  return r.length || !x.e ? r : pick(x.e);
}
function tutorStart() {
  $('scenSel').value = 'cold';
  loadFromMenus();
  TUT.on = true; TUT.view = null; TUT.last = -1; TUT.scrolledFor = -1;
  $('guide').hidden = true; $('tutor').hidden = false; $('btnTutor').textContent = 'Quitter le mode pédagogique';
  fitStage();
}
function tutorStop() {
  TUT.on = false; $('guide').hidden = false; $('tutor').hidden = true; $('tutRings').innerHTML = '';
  $('btnTutor').textContent = 'Mode pédagogique'; fitStage();
}
function tutorShown() { const cur = currentStep(); return TUT.view != null ? TUT.view : cur; }
function tutorGo(i) {
  const s = STEPS[i]; if (!s) return;
  const x = TUT_X[i] || {};
  const v = isCoarse() && x.t ? 'main' : s.v;
  if (VIEW !== v) setView(v);
  if (s.mfd && UIC.mfdPage !== s.mfd) { UIC.mfdPage = s.mfd; renderMfd(); }
}
function tutorUpdate(dt) {
  if (!TUT.on) return;
  const cur = currentStep();
  if (cur !== TUT.last) { if (TUT.last >= 0 && cur > TUT.last) TUT.flashT = 1.6; TUT.last = cur; TUT.view = null; }
  const i = tutorShown();
  const box = $('tutor');
  if (i < 0) {
    const fin = i === -1;
    $('tutReturn').hidden = !fin; $('tutPrev').hidden = fin; $('tutNext').hidden = fin;
    $('tutNum').textContent = fin ? '✓' : '…'; $('tutStep').textContent = fin ? 'Vol terminé' : (PHASE_FR[S.phase] || S.phase);
    $('tutTxt').textContent = fin ? 'Bravo, tu as fait le vol complet. Appuie sur « Lancer le vol retour » pour repartir dans l\'autre sens.' : flightStatusText();
    $('tutWhy').textContent = ''; $('tutProg').textContent = ''; $('tutRings').innerHTML = ''; box.classList.add('dock'); return;
  }
  $('tutReturn').hidden = true; $('tutPrev').hidden = false; $('tutNext').hidden = false;
  const s = STEPS[i], x = TUT_X[i] || {};
  if (TUT.scrolledFor !== i) tutorGo(i);
  const txt = s.t;
  if ($('tutTxt').textContent !== txt) { $('tutTxt').textContent = txt; $('tutWhy').textContent = x.w || ''; }
  $('tutNum').textContent = String(i + 1);
  tutorDetail(i);
  $('tutStep').textContent = (GROUP_LBL[s.g] || '') + ' · étape ' + (i + 1) + ' / ' + STEPS.length + (TUT.view != null && TUT.view !== cur ? (UIC.guideDone.has(i) ? ' · déjà faite' : ' · à venir') : '');
  const prog = x.p ? x.p() : '';
  $('tutProg').textContent = TUT.flashT > 0 ? '✓ Étape ' + (TUT.last) + ' réussie' : prog;
  $('tutProg').className = 'tut-prog' + (TUT.flashT > 0 ? ' ok' : '');
  if (TUT.flashT > 0) TUT.flashT -= dt;
  $('tutPrev').disabled = i <= 0; $('tutNext').textContent = TUT.view != null && TUT.view < cur ? 'Revenir à l\'étape en cours' : 'Passer cette étape';
  // cibles
  const tg = tutorTargets(i);
  if (TUT.scrolledFor !== i) { TUT.scrolledFor = i; if (tg[0]) setTimeout(() => { try { tg[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }); } catch (e) { } }, 60); }
  const rings = $('tutRings');
  while (rings.children.length < tg.length) rings.appendChild(el('div', 'tring'));
  while (rings.children.length > tg.length) rings.lastChild.remove();
  tg.forEach((t, k) => {
    const r = t.getBoundingClientRect(), d = rings.children[k];
    Object.assign(d.style, { left: (r.left - 6) + 'px', top: (r.top - 6) + 'px', width: (r.width + 12) + 'px', height: (r.height + 12) + 'px' });
    d.dataset.n = k === 0 ? String(i + 1) : '';
  });
  // position de la bulle
  const vw = window.innerWidth, vh = window.innerHeight;
  if (vw < 760 || !tg[0]) { box.classList.add('dock'); box.style.left = box.style.top = ''; return; }
  box.classList.remove('dock');
  const r = tg[0].getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
  let top = r.bottom + 16, above = false;
  if (top + bh > vh - 8) { top = r.top - bh - 16; above = true; }
  if (top < 8) top = Math.min(vh - bh - 8, Math.max(8, r.bottom + 16));
  const left = clamp(r.left + r.width / 2 - bw / 2, 12, vw - bw - 12);
  box.style.left = left + 'px'; box.style.top = top + 'px';
  box.classList.toggle('above', above);
  box.style.setProperty('--ax', clamp(r.left + r.width / 2 - left, 20, bw - 20) + 'px');
}

/* ------------------------------ SONS ------------------------------
   Tout est généré dans la page (Web Audio). Les annonces vocales sont des fichiers
   embarqués (voix de synthèse hors ligne), donc elles marchent même sans synthèse vocale du téléphone. */
const SND = { ctx: null, last: { mc: false, ap: false, gnd: true, belts: 2, gear: 1, flaps: 0, v1: false, vr: false }, wT: 0, gT: 0, voice: {}, busyT: 0 };
function noiseBuf(c) { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function loopNoise(c, type, f, q) {
  const s = c.createBufferSource(); s.buffer = SND.nb; s.loop = true;
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q;
  const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(SND.out); s.start(); return { f: fl, g };
}
function loopOsc(c, type, f) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const g = c.createGain(); g.gain.value = 0; o.connect(g); g.connect(SND.out); o.start(); return { o, g }; }
function sndInit() {
  if (SND.ctx) { try { SND.ctx.resume(); } catch (e) { } return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = SND.ctx = new AC();
    SND.out = c.createGain(); SND.out.gain.value = 0.9; SND.out.connect(c.destination);
    SND.nb = noiseBuf(c);
    SND.eng = loopNoise(c, 'lowpass', 300); SND.engTone = loopOsc(c, 'sawtooth', 60);
    SND.whine = loopOsc(c, 'sine', 900);          // sifflement turbine (démarrage, N3)
    SND.apu = loopOsc(c, 'triangle', 1400);       // APU
    SND.wind = loopNoise(c, 'bandpass', 900, 0.6); // vent aérodynamique
    SND.roll = loopNoise(c, 'lowpass', 120);       // roulement au sol
    SND.hyd = loopOsc(c, 'square', 110);           // moteurs hydrauliques (train, volets)
    if (typeof VOICE !== 'undefined') for (const k in VOICE) {
      try {   // décodage base64 local : pas de requête réseau (bloquée dans l'artifact)
        const bin = atob(VOICE[k].split(',')[1]), u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        c.decodeAudioData(u8.buffer, buf => { SND.voice[k] = buf; }, () => { });
      } catch (e) { }
    }
  } catch (e) { SND.ctx = null; }
}
function playVoice(key) {
  const c = SND.ctx, b = SND.voice[key]; if (!c || !b) return false;
  if (SND.cur) { try { SND.cur.stop(); } catch (e) { } }
  const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = 1.4; s.connect(g); g.connect(SND.out); s.start(); SND.cur = s;
  return true;
}
function tone(f, t0, dur, vol, type) {
  const c = SND.ctx; if (!c) return;
  const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(SND.out); o.start(t0); o.stop(t0 + dur + 0.05);
}
function thud(vol) { const c = SND.ctx; if (!c) return; const s = c.createBufferSource(); s.buffer = SND.nb; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; const g = c.createGain(); const t = c.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); s.connect(f); f.connect(g); g.connect(SND.out); s.start(t); s.stop(t + 0.6); }
function squelch(atc) { if (!S.sound || !SND.ctx) return; const c = SND.ctx, s = c.createBufferSource(); s.buffer = SND.nb; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; const g = c.createGain(), t = c.currentTime; g.gain.setValueAtTime(atc ? 0.12 : 0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); s.connect(f); f.connect(g); g.connect(SND.out); s.start(t); s.stop(t + 0.2); if (atc) tone(1200, t + 0.02, 0.06, 0.04, 'square'); }
function sndClick() { if (S && S.sound && SND.ctx) tone(2600, SND.ctx.currentTime, 0.025, 0.05, 'square'); }
const setG = (n, v, tc) => n.g.gain.setTargetAtTime(v, SND.ctx.currentTime, tc || 0.3);
function sndUpdate(dt) {
  const c = SND.ctx; if (!c || !SND.eng) return;
  const now = c.currentTime, all = [SND.eng, SND.engTone, SND.whine, SND.apu, SND.wind, SND.roll, SND.hyd];
  if (!S.sound || S.paused) { all.forEach(n => setG(n, 0, 0.1)); return; }
  const E = S.eng, a = S.ac, n1 = (E[0].n1 + E[1].n1) / 2, n3 = (E[0].n3 + E[1].n3) / 2, on = n3 > 2;
  const kt = a.V / KT, extern = VIEW === 'main' ? 1 : 0.6;
  setG(SND.eng, on ? (0.04 + n1 / 100 * 0.2) * extern : 0, 0.4); SND.eng.f.frequency.setTargetAtTime(160 + n1 * 15, now, 0.4);
  setG(SND.engTone, on ? 0.008 + n3 / 100 * 0.022 : 0, 0.4); SND.engTone.o.frequency.setTargetAtTime(30 + n3 * 1.5, now, 0.4);
  const start = E.some(e => e.st === 'start' || (e.st === 'shutdown' && e.n3 > 5));
  setG(SND.whine, start ? 0.035 : on ? 0.008 : 0, 0.5); SND.whine.o.frequency.setTargetAtTime(500 + n3 * 22, now, 0.5);
  const ap = S.sys.apu;
  setG(SND.apu, ap.n > 3 ? 0.012 * Math.min(1, ap.n / 60) : 0, 0.6); SND.apu.o.frequency.setTargetAtTime(700 + ap.n * 14, now, 0.6);
  setG(SND.wind, a.onGround ? 0 : Math.min(0.09, kt / 3200), 0.5); SND.wind.f.frequency.setTargetAtTime(500 + kt * 3, now, 0.5);
  setG(SND.roll, a.onGround && kt > 1 ? Math.min(0.25, 0.03 + kt / 700) : 0, 0.2);
  const moving = Math.abs(S.sys.gear - (S.ctl.gearDown ? 1 : 0)) > 0.01 || Math.abs(S.sys.flaps - S.ctl.flapsLever) > 0.01;
  setG(SND.hyd, moving ? 0.012 : 0, 0.2);
  // événements
  if (!SND.last.gnd && a.onGround) thud(Math.min(1, 0.35 + Math.abs(a.lastTdVs) / 900));
  SND.last.gnd = a.onGround;
  if (S.ovh.seatBelts === 0 && SND.last.belts !== 0) { tone(880, now, 0.6, 0.12); tone(660, now + 0.35, 0.8, 0.12); }   // carillon cabine « ding-dong »
  SND.last.belts = S.ovh.seatBelts;
  if (S.ecam.mc && !SND.last.mc) tone(1046, now, 0.45, 0.2);                    // MASTER CAUTION
  SND.last.mc = S.ecam.mc;
  SND.wT -= dt;
  if (S.ecam.mw && SND.wT <= 0) { tone(1400, now, 0.16, 0.16, 'square'); tone(1050, now + 0.2, 0.16, 0.16, 'square'); SND.wT = 0.55; } // MASTER WARNING
  const apOn = S.fcu.ap1 || S.fcu.ap2;
  if (SND.last.ap && !apOn) [523, 659, 784, 1047, 784, 1047].forEach((f, k) => tone(f, now + k * 0.08, 0.12, 0.12, 'triangle'));
  SND.last.ap = apOn;
  // annonces au décollage (aide pédagogique)
  if (a.onGround && !S.tookOff && S.fms.v1) {
    const v = ias();
    if (!SND.last.v1 && v >= S.fms.v1) { say('V1'); SND.last.v1 = true; }
    if (!SND.last.vr && v >= S.fms.vr) { say('ROTATE'); SND.last.vr = true; }
    if (v < 30) SND.last.v1 = SND.last.vr = false;
  }
  SND.gT -= dt;
  if (S.gpws && S.gpws.lvl && SND.gT <= 0 && !SND.voice[S.gpws.lvl]) { tone(880, now, 0.12, 0.16, 'square'); tone(880, now + 0.18, 0.12, 0.16, 'square'); SND.gT = 1.2; }
}
function toggleSound() {
  S.sound = !S.sound;
  $('btnSound').textContent = 'Son : ' + (S.sound ? 'oui' : 'non');
  if (S.sound) { sndInit(); if (SND.ctx) tone(1046, SND.ctx.currentTime + 0.05, 0.3, 0.15); setTimeout(() => say('SOUND ON'), 600); }
  if (S.sound && !SND.ctx) showMsg('Ce navigateur bloque le son. Essaie dans Chrome ou Safari.', 'warn', 6);
}

/* ------------------------------ MODE PÉDAGOGIQUE DÉTAILLÉ ------------------------------
   Pour chaque étape : ce qu'il faut regarder. Pour chaque phase : qui fait quoi, l'erreur fréquente, une leçon. */
const TUT_OBS = [
  'Le voyant OFF de chaque batterie s\'éteint. L\'écran de secours ISIS s\'allume sous le PFD.',
  'Le voyant AVAIL (vert) devient ON (bleu). Les quatre grands écrans s\'allument. Sur le SD, page ELEC : AC 1 et AC 2 en vert.',
  'Le PFD affiche ATT en rouge et « ALIGN » ; l\'EWD affiche « IR IN ALIGN x MN » ; le ND affiche « MAP NOT AVAIL » jusqu\'à la fin.',
  'Rien à l\'écran : regarde le sélecteur passer sur 1.',
  'Le SD passe sur la page APU : N monte jusqu\'à 100 %, l\'EGT culmine puis se stabilise. AVAIL s\'allume en vert sur le bouton START.',
  'Page BLEED : la vanne APU s\'ouvre (trait vert), la pression des conduits monte vers 38 PSI.',
  'Page INIT du FMS : la route est construite ; le ND affiche les points en vert.',
  'FOB sur l\'EWD et page FUEL du SD : les réservoirs se remplissent.',
  'Les vitesses V1 (chiffre 1 bleu) et VR (point bleu) apparaîtront sur la bande vitesse au décollage.',
  'La valeur de l\'ALT au FCU s\'affiche en bleu en haut de la bande altitude du PFD.',
  'L\'EWD affiche les mémos SEAT BELTS et NO SMOKING en vert.',
  'Les portes se ferment : page DOOR du SD, tout passe au vert.',
  'Le sélecteur ENG MODE indique IGN START.',
  'SD page ENG : la vanne de démarrage s\'ouvre, N3 monte ; vers 25 %, le carburant arrive (FF) et l\'EGT bondit. EWD : N1 se met à tourner.',
  'Même séquence. Surveille que l\'EGT ne dépasse pas la zone rouge (démarrage chaud).',
  'Le mémo IGNITION disparaît de l\'EWD.',
  'Page ELEC : les générateurs moteurs (GEN 1A, 1B, 2A, 2B) alimentent les barres AC. Page BLEED : l\'air vient des moteurs.',
  'Sur l\'EWD, l\'indicateur becs/volets (S et F) se déploie et affiche « 1+F ».',
  'Mémo GND SPLRS ARMED, puis ligne SPLRS ARM verte dans le mémo T.O.',
  'Le bouton RTO s\'allume ; le mémo T.O passe AUTO BRK RTO en vert.',
  'Dans la vue extérieure, le phare de roulage éclaire le sol.',
  'Le mémo T.O de l\'EWD doit être entièrement vert : « T.O CONFIG NORMAL ».',
  'ND en 2 NM : plan de l\'aéroport et trajet en magenta. Vitesse sol en haut à gauche du ND (30 kt maximum).',
  'Le mémo PARK BRK disparaît.',
  'Feux allumés : l\'avion est visible pour la tour et les autres avions.',
  'FMA (haut du PFD) : MAN FLX 50 | SRS | RWY. EWD : N1 monte vers la limite FLX.',
  'Bande vitesse : chiffre 1 bleu = V1, point bleu = VR. Après la rotation, suis les barres vertes du directeur de vol.',
  'Vario (à droite du PFD) positif et altitude qui monte. Page WHEEL : les triangles s\'éteignent quand le train est rentré.',
  'LVR CLB clignote en blanc dans le FMA. Une fois les manettes sur CL : THR CLB, puis A/THR en blanc.',
  'FMA colonne de droite : AP1 s\'affiche. Les barres FD restent centrées.',
  'Sur la bande vitesse : le repère F puis S, puis le point vert (vitesse de finesse max) en lisse.',
  'Le FMA passe en CLB (montée gérée), l\'altitude cible s\'affiche en magenta.',
  'En bas de la bande altitude : STD au lieu de QNH 1013. L\'altitude s\'affiche en niveau de vol.',
  'Plus de lumière au sol dans la vue extérieure : on est au-dessus des nuages.',
  'Le ND affiche T/D (début de descente). Page FUEL : le carburant baisse d\'environ 100 kg par minute.',
  'Le FMA passe en DES. Le ND : MORE DRAG s\'affiche si l\'avion est au-dessus du profil.',
  'En bas de la bande altitude : QNH 1013 au lieu de STD.',
  'FMA : LOC et G/S en bleu (armés), puis en vert quand ils sont capturés. Losanges magenta sur le PFD.',
  'FMA : AP1+2 et CAT 3 DUAL.',
  'Bande vitesse : la vitesse cible magenta baisse vers S puis F.',
  'Trois triangles verts sur le panneau L/G et la page WHEEL.',
  'Mémo LDG de l\'EWD : FLAPS FULL devient vert.',
  'Mémo LDG : tout vert. Page WHEEL : AUTO BRK 2 ou 3.',
  'Annonces 50, 40, 30, 20, 10 puis RETARD. Le FMA passe FLARE puis ROLL OUT. DECEL apparaît sur la page WHEEL.',
  'Vitesse sol en dessous de 30 kt avant de quitter la piste.',
  'ND en 2 NM : trajet magenta jusqu\'au parking (GATE).',
  'EWD : N1 retombe à zéro. Page DOOR : les portes peuvent s\'ouvrir.',
];
const TUT_GROUP = {
  prep: { who: 'Le commandant (CDB) fait la préparation du cockpit côté gauche ; le copilote (OPL) prépare le FMS et récupère la clairance radio.', err: 'Démarrer l\'APU sans les batteries, ou bouger l\'avion pendant l\'alignement des centrales (il faut recommencer).',
    lesson: 'Un avion « froid » n\'a ni électricité ni air. On allume d\'abord les batteries (courant continu), puis une source de courant alternatif (groupe de parc ou APU) pour les écrans. Les centrales inertielles (IR) mesurent la rotation de la Terre pour trouver le nord : l\'avion doit rester immobile. Le FMS reçoit la route, le carburant et les performances : sans ces données, ni pilote auto géré, ni vitesses V1/VR/V2.' },
  start: { who: 'Le CDB demande la mise en route au sol ; l\'OPL lit la check-list et surveille les paramètres moteur ; le personnel au sol vérifie que la zone est dégagée.', err: 'Démarrer sans air (APU BLEED OFF) : le moteur ne tourne pas. Ou laisser ENG MODE sur IGN START après le démarrage.',
    lesson: 'Le Trent XWB a trois arbres. L\'air de l\'APU fait tourner le démarreur, qui entraîne N3. Vers 25 %, le calculateur moteur (FADEC) ouvre le carburant et allume : l\'EGT monte d\'un coup, c\'est l\'allumage. Le moteur accélère seul jusqu\'au ralenti. Ensuite ses générateurs et son air prennent le relais de l\'APU.' },
  taxi: { who: 'Au sol, c\'est le CDB qui roule (le volant est à gauche). L\'OPL gère la radio avec le sol, la check-list et la configuration de décollage.', err: 'Rouler trop vite dans les virages, ou oublier les volets : alarme CONFIG au moment de mettre les gaz.',
    lesson: 'Un A350 de 250 tonnes démarre avec un petit filet de gaz puis roule presque au ralenti. On tourne avec la roulette de nez (tiller) ; le palonnier ne sert qu\'aux petites corrections. La configuration de décollage (volets, spoilers, freins auto) se règle avant la piste et se vérifie avec le test T.O CONFIG.' },
  to: { who: 'Le pilote aux commandes (PF) met les gaz, tient l\'axe puis cabre. Le pilote qui surveille (PM) annonce « poussée réglée », « 100 nœuds », « V1 », « rotation », « vario positif ».', err: 'Cabrer trop tôt ou trop fort (toucher de queue), ou oublier de passer en CL à LVR CLB.',
    lesson: 'Avant V1, on peut encore s\'arrêter sur la piste ; après V1, on décolle même avec une panne. À VR, on cabre doucement (environ 3° par seconde) vers 10 à 15°. Le mode SRS du directeur de vol garde V2 + 10 kt, la vitesse de meilleure montée en sécurité. À 1 500 ft, on réduit à la poussée de montée.' },
  clb: { who: 'Le PF surveille la trajectoire et le FMA. Le PM gère la radio et les changements de fréquence, et règle l\'altimètre.', err: 'Oublier de passer l\'altimètre sur STD : les autres avions et le contrôle ne lisent plus la même altitude.',
    lesson: 'Sous 10 000 ft, la vitesse est limitée à 250 kt. Ensuite l\'A/THR passe à 300 kt, puis à Mach 0,85 quand l\'air se raréfie. En montée gérée (CLB), le FMS respecte les contraintes et monte jusqu\'à l\'altitude du FCU, puis passe en ALT CRZ.' },
  crz: { who: 'Les deux pilotes se partagent la veille. Le PM fait les points carburant et position, et gère les changements de contrôle d\'un pays à l\'autre.', err: 'Ne plus surveiller le carburant et les écrans pendant l\'accélération du temps.',
    lesson: 'En croisière, l\'avion brûle environ 6 tonnes de carburant par heure et s\'allège : son niveau optimal monte. Sur un long-courrier, on change de contrôle aérien à chaque pays traversé. Le relief sous la route (hauts plateaux d\'Éthiopie) reste très loin sous le FL370.' },
  des: { who: 'Le PF prépare et fait le briefing arrivée, le PM le vérifie. La descente est demandée au contrôle avant le T/D.', err: 'Descendre trop tard : l\'avion arrive trop haut et trop vite. Il faut alors sortir les aérofreins (MORE DRAG).',
    lesson: 'La descente se planifie avec la règle du « 3 pour 1 » : 3 NM pour 1 000 ft. Depuis le FL370 vers un aéroport au niveau de la mer, cela fait environ 110 NM, plus de la marge pour ralentir à 250 kt sous 10 000 ft. En mode DES, le FMS suit ce profil au ralenti.' },
  app: { who: 'Le PF annonce les configurations (« volets 1 », « train sorti »…), le PM les exécute et les vérifie. Le PM surveille les écarts ILS et annonce les hauteurs.', err: 'Sortir les volets au-dessus de leur vitesse maximale, ou oublier le train (alarme L/G GEAR NOT DOWN).',
    lesson: 'L\'ILS guide l\'avion sur l\'axe (LOC) et sur une pente de 3° (G/S). Deux pilotes auto engagés (CAT 3 DUAL) permettent un atterrissage automatique : arrondi (FLARE) vers 40 ft, réduction des gaz (RETARD), puis tenue de l\'axe au sol (ROLL OUT).' },
  after: { who: 'Le CDB roule jusqu\'au poste ; l\'OPL range l\'avion (volets, spoilers, feux) et gère la radio avec le sol.', err: 'Couper les moteurs sans frein de parking, ou oublier le BEACON : le personnel au sol ne doit approcher qu\'une fois le feu éteint.',
    lesson: 'Après l\'atterrissage, on dégage la piste au plus vite, puis on nettoie l\'avion : volets rentrés, spoilers désarmés. Au poste : frein de parking, moteurs coupés, feu anticollision éteint. Le vol est inscrit au journal : heures OUT, OFF, ON, IN et carburant consommé.' },
};
TUT.detail = true;
function tutorDetail(i) {
  const box = $('tutMore'); if (!box) return;
  if (!TUT.detail || i < 0 || !STEPS[i]) { box.hidden = true; return; }
  const g = TUT_GROUP[STEPS[i].g] || {};
  const h = `<p><b>À regarder</b> ${TUT_OBS[i] || ''}</p><p><b>Qui fait quoi</b> ${g.who || ''}</p><p><b>Erreur fréquente</b> ${g.err || ''}</p>`;
  if (box.dataset.i !== String(i)) { box.innerHTML = h; box.dataset.i = String(i); }
  box.hidden = false;
}
function tutorLesson() {
  const i = tutorShown(), g = STEPS[i] ? STEPS[i].g : 'prep', L = TUT_GROUP[g];
  $('lessonTitle').textContent = 'Leçon · ' + (GROUP_LBL[g] || '');
  $('lessonTxt').textContent = L.lesson;
  try { $('lessonDlg').showModal(); } catch (e) { $('lessonDlg').setAttribute('open', ''); }
}
