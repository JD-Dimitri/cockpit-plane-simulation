/* =====================================================================
   RADIO ET ÉQUIPAGE : contrôle aérien ⇄ commandant (toi) ⇄ copilote ⇄ cabine
   Phraséologie simplifiée, fréquences et secteurs de contrôle fictifs ou approximatifs.
   Aéroports français : échanges en français. Contrôles étrangers : anglais + traduction.
   ===================================================================== */
const COMMS = { log: [], fired: new Set(), queue: [], pending: null, region: '', readbacks: 0, missed: 0, nextChat: 0, chatI: 0, lastAlert: {} };
const WHO = { CDB: 'Commandant (toi)', OPL: 'Copilote', PNC: 'Chef de cabine', PA: 'Annonce passagers' };
const AP_ST = {
  FMEE: { sol: 'Gillot Sol', twr: 'Gillot Tour', app: 'Réunion Approche', fs: '121.7', ft: '118.1', fa: '119.4' },
  LFPO: { sol: 'Orly Sol', twr: 'Orly Tour', app: 'Paris Approche', fs: '121.8', ft: '118.7', fa: '120.85' },
  LFPG: { sol: 'De Gaulle Sol', twr: 'De Gaulle Tour', app: 'Paris Approche', fs: '121.6', ft: '119.25', fa: '121.15' },
};
const cs = () => 'Sim ' + (S.fms.fltNbr.replace(/\D/g, '') || '976');
const fl = ft => 'niveau ' + Math.round(ft / 100);
/* Secteurs de contrôle en route (découpage simplifié) */
function ctlRegion(lat, lon) {
  for (const k of ['FMEE', 'LFPO', 'LFPG']) { const ap = AIRPORTS[k]; if (gcDist(lat, lon, ap.lat, ap.lon) < 140000) return { n: AP_ST[k].app, fr: true, f: AP_ST[k].fa }; }
  if (lat < -15 && lon > 51) return { n: 'Mauritius Control', fr: false, f: '128.4', land: 'l\'océan Indien, au large de Maurice' };
  if (lat < -11 && lon > 42) return { n: 'Antananarivo Control', fr: false, f: '126.3', land: 'Madagascar' };
  if (lat < 5 && lon > 34) return { n: 'Nairobi Control', fr: false, f: '127.9', land: 'l\'Afrique de l\'Est, côté Kenya' };
  if (lat < 15 && lon > 32) return { n: 'Addis Ababa Control', fr: false, f: '125.7', land: 'les hauts plateaux d\'Éthiopie' };
  if (lat < 22 && lon > 21) return { n: 'Khartoum Control', fr: false, f: '128.1', land: 'le Soudan et le Nil' };
  if (lat < 32 && lon > 24) return { n: 'Cairo Control', fr: false, f: '124.5', land: 'le désert égyptien' };
  if (lat < 33) return { n: 'Tripoli Control', fr: false, f: '127.3', land: 'le Sahara libyen' };
  if (lat < 40 && lon > 18) return { n: 'Athinai Control', fr: false, f: '133.6', land: 'la mer Méditerranée orientale' };
  if (lat < 43 && lon > 7.5) return { n: 'Roma Control', fr: false, f: '135.2', land: 'l\'Italie et la Méditerranée' };
  if (lat < 46.3) return { n: 'Marseille Contrôle', fr: true, f: '133.4', land: 'le sud de la France' };
  return { n: 'Paris Contrôle', fr: true, f: '128.0', land: 'la France' };
}
function cmPush(who, text, opt) {
  COMMS.queue.push({ who, text, ...(opt || {}) });
}
function atc(st, text, fr, rb, onDone) { cmPush('ATC', text, { st, fr, rb, onDone }); }
function crew(who, text) { cmPush(who, text); }
function commsReset(kind) {
  Object.assign(COMMS, { log: [], fired: new Set(), queue: [], pending: null, region: '', readbacks: 0, missed: 0, nextChat: 0, chatI: 0, lastAlert: {} });
  const skip = { ready: ['clr', 'board', 'start', 'taxi'], cruise: ['clr', 'board', 'start', 'taxi', 'beforeTO', 'roll', 'air', 'handoff', 'fl100', 'toc'], approach: ['clr', 'board', 'start', 'taxi', 'beforeTO', 'roll', 'air', 'handoff', 'fl100', 'toc', 'brief', 'desc'] }[kind] || [];
  skip.forEach(k => COMMS.fired.add(k));
  if (kind === 'cruise' || kind === 'approach') COMMS.region = ctlRegion(S.ac.lat, S.ac.lon).n;
}
const once = (id, cond, fn) => { if (!COMMS.fired.has(id) && cond) { COMMS.fired.add(id); fn(); } };

function commsUpdate() {
  if (!S || S.crash) return;
  const a = S.ac, f = S.fms, dep = AP_ST[f.from], arr = AP_ST[f.to], now = performance.now();
  const run = S.eng.every(e => e.st === 'run'), ra = radAlt(), kt = ias();
  const depR = f.depRwy, arrR = f.arrRwy;
  // ---------- au sol, départ ----------
  once('clr', a.onGround && !S.tookOff && f.initDone && S.sys.elec.ac, () => {
    const sq = String(4000 + Math.floor(Math.random() * 3) * 100 + 21 + Math.floor(Math.random() * 50));
    crew('CDB', `${dep.sol}, ${cs()}, A350 au poste, avec l'information Alpha, nous demandons la clairance pour ${AIRPORTS[f.to].name}.`);
    atc(dep.sol, `${cs()}, autorisé ${AIRPORTS[f.to].name}, départ piste ${depR}, montée initiale 10 000 pieds, transpondeur ${sq}.`, null,
      `Autorisé ${AIRPORTS[f.to].name}, piste ${depR}, montée 10 000 pieds, transpondeur ${sq}, ${cs()}.`, () => { UIC.xpdr.code = sq; });
  });
  once('board', a.onGround && !S.tookOff && f.fuelDone && COMMS.fired.has('clr'), () => {
    crew('PNC', `Commandant, l'embarquement est terminé : 318 passagers et 14 membres d'équipage de cabine. Les portes peuvent être fermées.`);
    crew('CDB', `Merci. Fermeture des portes, on démarre dans quelques minutes.`);
  });
  once('start', a.onGround && !S.tookOff && S.ovh.beacon === 0, () => {
    crew('OPL', `Check-list avant mise en route : portes fermées, feu anticollision allumé, carburant ${Math.round(fob() / 100) / 10} tonnes, frein de parking serré. Terminée.`);
    crew('CDB', `${dep.sol}, ${cs()}, prêts pour la mise en route.`);
    atc(dep.sol, `${cs()}, mise en route approuvée, rappelez prêts à rouler.`, null, `Mise en route approuvée, ${cs()}.`);
    crew('PNC', `PNC aux portes : armement des toboggans et vérification de la porte opposée.`);
  });
  once('taxi', a.onGround && !S.tookOff && run && S.taxi && !S.taxi.done && (!S.ctl.park || S.taxi.auto), () => {
    crew('CDB', `${dep.sol}, ${cs()}, prêts à rouler.`);
    atc(dep.sol, `${cs()}, roulez point d'arrêt piste ${depR} par le taxiway parallèle, QNH 1013.`, null, `Point d'arrêt piste ${depR} par le parallèle, QNH 1013, ${cs()}.`);
  });
  once('beforeTO', a.onGround && !S.tookOff && run && (onRunwayThr() || (S.taxi && taxiInfo() && taxiInfo().rest < 350)), () => {
    crew('OPL', `Check-list avant décollage : volets ${S.ctl.flapsLever === 1 ? '1+F' : S.ctl.flapsLever}, spoilers ${S.ctl.spdArmed ? 'armés' : 'à armer'}, freinage auto ${S.ctl.autobrk === 1 ? 'RTO' : 'à régler'}, configuration décollage ${UIC.toTested ? 'normale' : 'à tester'}. Terminée.`);
    crew('PNC', `Cabine prête pour le décollage.`);
    crew('CDB', `${dep.twr}, ${cs()}, prêts au départ piste ${depR}.`);
    atc(dep.twr, `${cs()}, vent calme, piste ${depR}, autorisé au décollage.`, null, `Autorisé au décollage piste ${depR}, ${cs()}.`);
  });
  once('roll', a.onGround && !S.tookOff && kt > 40 && Math.max(...S.ctl.tla) >= TLA_FLX - 0.5, () => crew('OPL', `Poussée réglée.`));
  once('100kt', a.onGround && !S.tookOff && kt > 100, () => { crew('OPL', `100 nœuds.`); crew('CDB', `Vérifié.`); });
  once('air', !a.onGround && S.tookOff && a.vs > 3 && ra > 50, () => { crew('OPL', `Vario positif.`); crew('CDB', `Train sur rentré.`); });
  once('handoff', !a.onGround && S.tookOff && ra > 2000 && a.vs > 0, () => {
    atc(dep.twr, `${cs()}, contactez ${dep.app} sur ${dep.fa}, au revoir.`, null, `${dep.app} ${dep.fa}, ${cs()}, au revoir.`, () => {
      crew('CDB', `${dep.app}, ${cs()}, en montée vers 10 000 pieds.`);
      atc(dep.app, `${cs()}, identifié radar. Montez ${fl(f.crzFL * 100)}, direct ${f.wpts[Math.min(f.active + 1, f.wpts.length - 1)].id}.`, null, `Montée ${fl(f.crzFL * 100)}, direct ${f.wpts[Math.min(f.active + 1, f.wpts.length - 1)].id}, ${cs()}.`);
      COMMS.region = dep.app;
    });
  });
  once('fl100', !a.onGround && a.alt / FT > 10000 && a.vs > 0, () => {
    crew('PNC', `Commandant, pouvons-nous commencer le service ?`);
    crew('CDB', S.ovh.seatBelts === 0 ? `Oui, mais je garde les consignes ceintures allumées encore un moment.` : `Oui, allez-y. Les consignes ceintures sont éteintes.`);
  });
  // ---------- croisière ----------
  once('toc', S.phase === 'CRUISE', () => {
    const r = ctlRegion(a.lat, a.lon); const ete = typeof eteHours === 'function' && S.nav ? eteHours(S.nav.rem) : 0;
    crew('PA', `Mesdames et messieurs, ici le commandant. Nous volons à ${Math.round(a.alt)} mètres, à environ ${Math.round(a.V * 3.6)} km/h. Nous survolons ${r.land || 'la région'}. Arrivée prévue à ${AIRPORTS[f.to].name} dans ${hhmm(ete)}, vers ${utcStr(simUtc() + ete * 3600e3)} heure UTC. Bon vol.`);
    crew('OPL', `Point carburant : ${Math.round(fob() / 100) / 10} tonnes à bord, consommation ${Math.round((S.eng[0].ff + S.eng[1].ff) / 100) / 10} tonnes par heure. Prévu à l'arrivée : ${(Math.max(0, fob() - (S.nav ? S.nav.rem / NM * 12.6 : 0)) / 1000).toFixed(1)} tonnes. C'est conforme.`);
    COMMS.nextChat = S.t + 3600;
  });
  // changements de secteur
  if (!a.onGround && S.tookOff && a.alt / FT > 12000 && COMMS.fired.has('handoff')) {
    const r = ctlRegion(a.lat, a.lon);
    if (r.n !== COMMS.region && !COMMS.queue.length && !COMMS.pending) {
      const old = COMMS.region || dep.app;
      if (r.fr) atc(old, `${cs()}, contactez ${r.n} sur ${r.f}, au revoir.`, null, `${r.n} ${r.f}, ${cs()}.`, () => hello(r));
      else atc(old, `${cs()}, contact ${r.n} on ${r.f}, goodbye.`, `${cs()}, contactez ${r.n} sur ${r.f}, au revoir.`, `${r.n} ${r.f}, ${cs()}.`, () => hello(r));
      COMMS.region = r.n;
    }
  }
  // conversations de croisière (environ toutes les heures de vol)
  if (S.phase === 'CRUISE' && COMMS.nextChat && S.t > COMMS.nextChat && !COMMS.queue.length) {
    COMMS.nextChat = S.t + 3600;
    const r = ctlRegion(a.lat, a.lon), i = COMMS.chatI++ % 4;
    if (i === 0) { crew('OPL', `On survole ${r.land || 'la route'}. Relief maximal sous nous : environ ${Math.round(surfaceElev(a.lat, a.lon) / FT / 100) * 100} pieds, on a toute la marge.`); crew('CDB', `D'accord. Surveille quand même le TERR sur le ND.`); }
    if (i === 1) { crew('PNC', `Commandant, le service repas est terminé, tout est calme en cabine. Voulez-vous un café ?`); crew('CDB', `Volontiers, merci. Un pour le copilote aussi.`); }
    if (i === 2) { crew('OPL', `Point carburant : ${Math.round(fob() / 100) / 10} tonnes, on a brûlé ${Math.round(((S.fuelUsed || [0, 0])[0] + (S.fuelUsed || [0, 0])[1]) / 100) / 10} tonnes depuis le départ. Écart avec le plan : négligeable.`); crew('CDB', `Parfait, on continue.`); }
    if (i === 3) { crew('PNC', `Commandant, un passager demande à quelle heure nous arrivons.`); crew('CDB', `Vers ${utcStr(simUtc() + (S.nav ? eteHours(S.nav.rem) : 0) * 3600e3)} UTC. Je ferai une annonce avant la descente.`); }
  }
  // ---------- descente et arrivée ----------
  const td = typeof todRemaining === 'function' ? todRemaining() : null;
  once('brief', S.nav && td && S.nav.rem < td + 70 * NM && S.tookOff && !a.onGround, () => {
    crew('OPL', `Briefing arrivée : ${AIRPORTS[f.to].name}, approche ILS piste ${arrR}, minimums CAT 3 avec hauteur de décision ${f.dh} pieds, VAPP ${f.vapp} nœuds, volets ${f.ldgConf === 4 ? 'FULL' : '3'}, freinage auto ${f.ldgConf === 4 ? '3' : '2'}. Dégagement ${f.altn}. Carburant prévu à l'arrivée : ${(Math.max(0, fob() - S.nav.rem / NM * 12.6) / 1000).toFixed(1)} tonnes.`);
    crew('CDB', `Bien reçu. Question ?`); crew('OPL', `Aucune.`);
    crew('PA', `Mesdames et messieurs, nous commencerons bientôt notre descente vers ${AIRPORTS[f.to].city}. Merci de regagner vos sièges.`);
  });
  once('desc', S.nav && td && S.nav.rem < td + 8 * NM && S.tookOff && !a.onGround, () => {
    const r = ctlRegion(a.lat, a.lon);
    if (r.fr) atc(r.n, `${cs()}, descendez à votre discrétion 3 000 pieds QNH 1013, prévoyez approche ILS piste ${arrR}.`, null, `Descente 3 000 pieds QNH 1013, ILS piste ${arrR}, ${cs()}.`);
    else atc(r.n, `${cs()}, descend at your discretion flight level 100, expect ILS approach runway ${arrR}.`, `${cs()}, descendez à votre discrétion au niveau 100, prévoyez une approche ILS piste ${arrR}.`, `Descending flight level 100, ILS runway ${arrR}, ${cs()}.`);
  });
  once('cabinLdg', S.phase === 'APPROACH' && S.ovh.seatBelts === 0, () => { crew('PA', `PNC, préparez la cabine pour l'atterrissage.`); crew('PNC', `Commandant, cabine prête pour l'atterrissage.`); });
  once('appClr', S.nav && S.nav.rem < 30 * NM && S.tookOff && !a.onGround, () => {
    atc(arr.app, `${cs()}, autorisé approche ILS piste ${arrR}, rappelez établi.`, null, `Autorisé ILS piste ${arrR}, ${cs()}.`, () => {
      atc(arr.app, `${cs()}, contactez ${arr.twr} sur ${arr.ft}.`, null, `${arr.twr} ${arr.ft}, ${cs()}.`);
    });
  });
  once('ldgClr', S.nav && S.nav.rem < 9 * NM && S.tookOff && !a.onGround, () => {
    crew('CDB', `${arr.twr}, ${cs()}, établi ILS piste ${arrR}.`);
    atc(arr.twr, `${cs()}, vent calme, piste ${arrR}, autorisé atterrissage.`, null, `Autorisé atterrissage piste ${arrR}, ${cs()}.`);
  });
  once('td', a.onGround && S.tookOff && a.V > 50 * KT, () => crew('OPL', `Spoilers sortis. Inverseurs verts. Décélération.`));
  once('70kt', a.onGround && S.tookOff && kt < 70, () => crew('OPL', `70 nœuds.`));
  once('vacate', a.onGround && S.tookOff && a.V < 35 * KT, () => {
    atc(arr.twr, `${cs()}, dégagez par la prochaine bretelle, contactez ${arr.sol} sur ${arr.fs}.`, null, `Prochaine bretelle, ${arr.sol} ${arr.fs}, ${cs()}.`, () => {
      crew('CDB', `${arr.sol}, ${cs()}, piste dégagée.`);
      atc(arr.sol, `${cs()}, roulez au poste par le parallèle.`, null, `Au poste par le parallèle, ${cs()}.`);
    });
  });
  once('gate', S.arrived, () => {
    crew('PA', `PNC, désarmement des toboggans et vérification de la porte opposée.`);
    crew('PA', `Mesdames et messieurs, bienvenue à ${AIRPORTS[f.to].name}. Il est ${utcStr(simUtc())} UTC. Merci d'avoir voyagé avec nous.`);
    crew('OPL', `Check-list parking : moteurs coupés, feu anticollision éteint, frein de parking serré. Terminée. Beau vol !`);
  });
  // ---------- urgences ----------
  for (const al of S.ecam.alerts) {
    if (COMMS.lastAlert[al.id]) continue;
    COMMS.lastAlert[al.id] = true;
    if (al.lvl === 3 && /FIRE|FAIL/.test(al.title)) {
      crew('OPL', `ECAM : ${al.title}. Je lis la procédure.`);
      const st = COMMS.region || dep.twr;
      crew('CDB', `MAYDAY MAYDAY MAYDAY, ${st}, ${cs()}, ${al.title.toLowerCase().replace('eng', 'moteur')}, nous gérons la panne et demandons un retour vers ${a.onGround ? 'le parking' : 'le terrain le plus proche'}.`);
      atc(st, `${cs()}, MAYDAY reçu, vous êtes prioritaire, toutes les pistes sont à votre disposition.`, null, `Prioritaires, ${cs()}.`);
      crew('PNC', `Commandant, je suis prête : la cabine attend vos instructions.`);
    } else if (al.lvl >= 2 && !a.onGround) crew('OPL', `ECAM : ${al.title}.`);
  }
  if (S.gpws && S.gpws.lvl && !COMMS.lastAlert['gp' + S.gpws.lvl]) { COMMS.lastAlert['gp' + S.gpws.lvl] = true; crew('OPL', S.gpws.lvl === 'PULL UP' ? `PULL UP ! Tire, plein gaz !` : `${S.gpws.lvl} ! Attention au taux de descente.`); }
  // ---------- file d'affichage (une ligne toutes les 2,5 s) ----------
  if (COMMS.queue.length && !COMMS.pending && now >= (COMMS.nextAt || 0)) {
    const m = COMMS.queue.shift();
    m.utc = simUtc(); COMMS.log.push(m);
    if (typeof logEvent === 'function' && m.who === 'ATC') logEvent('radio', m.st + ' : ' + (m.fr || m.text));
    if (typeof squelch === 'function') squelch(m.who === 'ATC');
    COMMS.nextAt = now + 2500 + Math.min(4000, m.text.length * 25);
    if (m.rb) COMMS.pending = { m, until: now + 22000 };
  }
  if (COMMS.pending && now > COMMS.pending.until) { readback(false); }
}
function hello(r) {
  crew('CDB', r.fr ? `${r.n}, ${cs()}, ${fl(S.ac.alt / FT)}.` : `${r.n}, ${cs()}, maintaining flight level ${Math.round(S.ac.alt / FT / 100)}.`);
  if (r.fr) atc(r.n, `${cs()}, identifié, maintenez ${fl(S.ac.alt / FT)}.`, null, null);
  else atc(r.n, `${cs()}, radar contact, maintain flight level ${Math.round(S.ac.alt / FT / 100)}.`, `${cs()}, identifié radar, maintenez le niveau ${Math.round(S.ac.alt / FT / 100)}.`, null);
}
/* Collationnement : toi (bouton) ou le copilote (après 22 s sans réponse) */
function readback(byUser) {
  const p = COMMS.pending; if (!p) return;
  COMMS.pending = null;
  if (byUser) { COMMS.readbacks++; COMMS.log.push({ who: 'CDB', text: p.m.rb, utc: simUtc(), rbOk: true }); }
  else { COMMS.missed++; COMMS.log.push({ who: 'OPL', text: 'Je collationne : ' + p.m.rb, utc: simUtc() }); }
  if (p.m.onDone) p.m.onDone();
  COMMS.nextAt = performance.now() + 1800;
}
