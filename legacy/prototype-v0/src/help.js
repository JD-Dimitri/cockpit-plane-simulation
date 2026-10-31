/* =====================================================================
   AIDE CONTEXTUELLE « ? »
   Double-tap sur un élément (il s'entoure en orange) puis « ? » → fiche détaillée.
   Ou « ? » d'abord puis l'élément (dans ce cas il n'est pas actionné).
   ===================================================================== */
const HELP = { sel: null, pick: false, last: { t: 0, x: 0, y: 0, key: '' } };

/* ---------- textes : plafonnier ---------- */
const PANEL_HELP = {
  'ADIRS': 'Les trois centrales ADIRS fournissent à tout l\'avion l\'assiette, le cap, la position (partie IR, inertielle) et la vitesse, l\'altitude et la température (partie ADR, anémobarométrique). Trois exemplaires pour la redondance : l\'avion vole avec une seule.',
  'F/CTL': 'Calculateurs des commandes de vol électriques (fly-by-wire). Le manche ne bouge pas directement les gouvernes : il envoie un ordre aux PRIM (principaux) et SEC (secondaires) qui commandent les vérins hydrauliques et appliquent les protections (décrochage, inclinaison, survitesse).',
  'EVAC · RCDR · OXYGEN': 'Commandes d\'évacuation d\'urgence, enregistreurs de vol (les « boîtes noires ») et oxygène de l\'équipage et des passagers.',
  'CALLS · WIPER L': 'Appels vers la cabine et le mécanicien au sol, essuie-glace gauche et produit anti-pluie.',
  'FIRE': 'Protection incendie des deux moteurs et de l\'APU. Chaque zone a un bouton FIRE (sous capot rouge) qui coupe carburant, air, hydraulique et électricité de la zone, puis des bouteilles d\'agent extincteur (AGENT).',
  'ELEC': 'Production et distribution électrique. 4 générateurs moteurs (2 par moteur), le générateur de l\'APU, 2 prises de parc (EXT A et B) et 4 batteries. Les grands écrans demandent du courant alternatif (AC) ; les batteries ne fournissent que du continu (DC).',
  'HYD': 'Deux circuits hydrauliques indépendants, vert et jaune, à 5 000 psi. Ils actionnent gouvernes, volets, train et freins. Chaque moteur entraîne deux pompes ; des pompes électriques servent au sol ou en secours.',
  'FUEL': 'Pompes de carburant des réservoirs d\'aile (gauche, droit) et central. Le carburant du centre est transféré vers les ailes, qui alimentent les moteurs. X FEED relie les deux côtés.',
  'AIR': 'Air comprimé prélevé sur les moteurs ou l\'APU (bleed), et climatisation (PACKs) qui refroidissent cet air chaud pour pressuriser et ventiler cabine et cockpit.',
  'ANTI ICE': 'Antigivrage : air chaud dans les entrées d\'air des moteurs et le bord d\'attaque des ailes ; chauffage électrique des sondes et pare-brise.',
  'CABIN PRESS': 'Pressurisation. En croisière à 37 000 ft, la cabine est maintenue autour de 6 000 ft d\'altitude équivalente. Tout est automatique ; les commandes manuelles servent en cas de panne.',
  'ENG · APU': 'Démarrage manuel des moteurs (MAN START), alimentation au sol des calculateurs moteurs (FADEC GND) et commande de l\'APU, la petite turbine de queue.',
  'EXT LT': 'Feux extérieurs : stroboscopes, anticollision, éclairage des ailes, navigation, phares de dégagement de piste, d\'atterrissage et de roulage.',
  'SIGNS': 'Consignes lumineuses en cabine : ceintures, interdiction de fumer et éclairage des issues de secours.',
  'INT LT': 'Éclairage intérieur du cockpit et test de tous les voyants (ANN LT).',
  'CARGO · VENT · WIPER R': 'Ventilation des soutes et de la baie avionique, test de détection fumée soute et essuie-glace droit.',
};
const OVH_HELP = {
  adr: 'Partie anémobarométrique de la centrale n° {n}. Elle calcule vitesse, altitude, vario, Mach et température à partir des sondes Pitot, des prises statiques et des sondes d\'incidence. Sur OFF, ses données disparaissent des écrans qui l\'utilisent.',
  ir: 'Partie inertielle de la centrale n° {n} : gyrolasers et accéléromètres. Elle donne l\'assiette, le cap, la position et la vitesse sol. Au démarrage elle s\'aligne (≈ 2 min 30 ici) : l\'avion ne doit pas bouger. Le voyant ALIGN reste allumé pendant l\'alignement.',
  prim: 'Calculateur principal de commandes de vol n° {n}. Il calcule les ordres des gouvernes et les protections de la loi normale. Les trois PRIM se surveillent ; si tous sont perdus, les SEC prennent le relais en loi dégradée.',
  sec: 'Calculateur secondaire de commandes de vol n° {n}. Il sert de secours aux PRIM, avec des fonctions plus simples.',
  evacCmd: 'Déclenche l\'alarme d\'évacuation en cabine. Protégé par un capot pour éviter toute action involontaire. Ne sert qu\'au sol, en cas d\'urgence.',
  evacHorn: 'Coupe le klaxon d\'évacuation dans le cockpit.',
  rcdrGnd: 'Met en marche les enregistreurs de vol au sol (normalement automatiques dès le démarrage d\'un moteur), par exemple pour les tests.',
  crewOxy: 'Ouvre l\'alimentation des masques à oxygène du cockpit. Toujours en service en vol.',
  paxOxy: 'Fait tomber manuellement les masques à oxygène des passagers (automatique si la cabine dépasse environ 14 000 ft d\'altitude).',
  callAll: 'Appel général du personnel de cabine (interphone).', callMech: 'Appelle le mécanicien au sol (klaxon dans la soute avant).',
  wiperL: 'Essuie-glace côté commandant : arrêt, lent ou rapide. Limité en vitesse (environ 230 kt).', wiperR: 'Essuie-glace côté copilote.', rainRp: 'Projette un produit anti-pluie sur le pare-brise (sur ce simulateur : effet visuel non simulé).',
  eng1Fire: 'Bouton feu moteur 1, sous capot. Le pousser coupe le carburant, l\'air, l\'hydraulique et le générateur du moteur, et arme les bouteilles d\'extincteur (voyants SQUIB). Il s\'allume en rouge en cas de feu.',
  eng2Fire: 'Bouton feu moteur 2 : même fonctionnement que pour le moteur 1.', apuFire: 'Bouton feu de l\'APU : coupe l\'APU et arme sa bouteille d\'extincteur.',
  ag: 'Bouteille d\'agent extincteur. Utilisable seulement après avoir poussé le bouton FIRE correspondant (voyant SQUIB blanc). Une fois percutée, le voyant DISCH (ambre) s\'allume.',
  fireTest: 'Teste la détection incendie : tous les voyants FIRE s\'allument et l\'alarme sonne.',
  bat1: 'Batterie 1. Avec la batterie 2, elle alimente le réseau continu (DC) essentiel : voyants, écran de secours, démarrage de l\'APU. C\'est le premier geste d\'un cockpit froid.', bat2: 'Batterie 2 : voir BAT 1.',
  batEmer: 'Batterie de secours n° {n}. Elle alimente les équipements essentiels si toutes les autres sources tombent.',
  extA: 'Prise de parc A : courant alternatif 230 V fourni par le groupe au sol. Voyant AVAIL vert = groupe branché et disponible ; ON bleu = il alimente l\'avion. Se déconnecte quand l\'avion roule.', extB: 'Prise de parc B : voir EXT A.',
  gen: 'Générateur {n} entraîné par le moteur {m} (100 kVA). Il fournit le courant alternatif en vol. FAULT ambre : moteur en marche mais générateur hors ligne.',
  apuGen: 'Générateur de l\'APU : courant alternatif au sol ou en secours en vol, une fois l\'APU disponible.',
  busTie: 'Relie les deux côtés du réseau alternatif pour qu\'un seul générateur puisse tout alimenter. Normalement en AUTO.',
  acEss: 'Choisit quel côté alimente la barre alternative essentielle (normal ou ALTN). À changer seulement sur procédure.',
  galy: 'Alimentation des offices (cuisines) et de la cabine. Coupée en premier en cas de manque d\'électricité.', commercial: 'Équipements commerciaux de cabine (divertissement, prises).',
  engP: 'Pompe hydraulique {p} entraînée par le moteur {m}. Elle met le circuit {c} à 5 000 psi. FAULT : pression basse alors que le moteur tourne.',
  elecPG: 'Pompe électrique du circuit vert. AUTO : elle se met en route seule au sol (pour les freins et le roulage) ou en secours. ON : marche forcée.', elecPY: 'Pompe électrique du circuit jaune : voir ELEC PUMP G.',
  lp: 'Pompe {n} du réservoir d\'aile gauche : elle alimente le moteur 1. Les deux pompes fonctionnent ensemble ; une seule suffit.', rp: 'Pompe {n} du réservoir d\'aile droite : elle alimente le moteur 2.',
  ctr: 'Pompe de transfert du réservoir central ({s}). Elle envoie le carburant du centre vers les ailes. FAULT : réservoir vide.',
  xfeed: 'Intercommunication carburant : relie les circuits gauche et droit. Sert à rééquilibrer (alarme FUEL IMBALANCE) ou à alimenter les deux moteurs d\'un même côté.',
  pack: 'Groupe de climatisation {n}. Il refroidit l\'air chaud des moteurs et l\'envoie en cabine : c\'est lui qui pressurise. Il se coupe brièvement pendant le démarrage moteur.',
  hotAir: 'Air chaud de régulation {n} : mélangé à l\'air froid des packs pour régler la température de chaque zone.',
  engBleed: 'Prélèvement d\'air sur le moteur {n}. Cet air chaud sous pression sert à la climatisation, à l\'antigivrage et au démarrage de l\'autre moteur.',
  apuBleed: 'Prélèvement d\'air sur l\'APU. Indispensable au sol pour démarrer les moteurs et climatiser avant leur mise en route. À couper une fois les moteurs démarrés.',
  xbleed: 'Vanne d\'intercommunication d\'air entre les côtés gauche et droit. AUTO : elle s\'ouvre quand l\'APU fournit l\'air (pour démarrer le moteur 2).',
  ckptT: 'Température voulue dans le cockpit.', cabT: 'Température voulue en cabine.', ramAir: 'Ouvre une entrée d\'air dynamique extérieure si les deux packs sont en panne (ventilation de secours, sans pressurisation).',
  wingAI: 'Antigivrage des ailes par air chaud. À utiliser en conditions givrantes (humidité visible et température basse).', engAI: 'Antigivrage de l\'entrée d\'air du moteur {n}. Le givre peut endommager le moteur ou le faire caler.',
  probeHeat: 'Chauffage des sondes (Pitot, statiques, incidence) et des pare-brise. AUTO dès qu\'un moteur tourne. Une sonde Pitot givrée donne une vitesse fausse.',
  pressMode: 'Mode de pressurisation : AUTO (normal) ou MAN (le pilote règle lui-même la vitesse de variation cabine avec MAN V/S).', ldgElev: 'Altitude du terrain d\'arrivée utilisée pour la pressurisation. AUTO : prise dans le FMS.', manVs: 'Taux de montée ou descente de la cabine en mode manuel.', ditching: 'Amerrissage : ferme toutes les vannes sous la ligne de flottaison.',
  manStart: 'Démarrage manuel du moteur {n} : ouvre la vanne de démarreur sans la séquence automatique (procédures particulières).', fadec: 'Alimente au sol le calculateur du moteur {n} (FADEC) pour des tests, moteur arrêté.',
  apuMaster: 'Interrupteur principal de l\'APU : met sous tension son calculateur et ouvre sa trappe d\'entrée d\'air. Il faut ensuite appuyer sur START.',
  apuStart: 'Lance le démarrage de l\'APU (voyant ON bleu). Après environ 40 s, AVAIL s\'allume en vert : électricité et air sont disponibles.',
  strobe: 'Flashs blancs très puissants aux extrémités. ON sur la piste et en vol ; AUTO : automatiques dès que l\'avion quitte le sol.',
  beacon: 'Feu anticollision rouge clignotant. Allumé juste avant la mise en route et jusqu\'à l\'arrêt des moteurs : il prévient le personnel au sol.',
  wingLt: 'Éclaire le bord d\'attaque des ailes et les entrées d\'air pour vérifier le givre la nuit.', navLogo: 'Feux de navigation (rouge à gauche, vert à droite, blanc à l\'arrière) et éclairage du logo sur la dérive.',
  rwyTurn: 'Phares latéraux pour éclairer les bretelles de dégagement de piste.', land: 'Phares d\'atterrissage. Allumés pour le décollage et l\'atterrissage, et sous 10 000 ft.', nose: 'Phare de la roulette de nez : TAXI pour rouler, T.O pour décoller (plus puissant).',
  seatBelts: 'Consigne lumineuse « attachez vos ceintures » en cabine, avec un carillon.', noSmoking: 'Consigne « interdiction de fumer » et appareils électroniques.', emerExit: 'Éclairage des issues de secours. ARM : s\'allume automatiquement en cas de perte électrique.',
  ovhdInteg: 'Intensité de l\'éclairage des panneaux du plafonnier.', dome: 'Plafonnier lumineux du cockpit.', annLt: 'TEST allume tous les voyants pour vérifier qu\'aucune ampoule n\'est grillée ; BRT/DIM règlent leur intensité.',
  cargoAir: 'Ventilation des soutes (utile pour les animaux ou les denrées).', cargoSmk: 'Teste la détection de fumée dans les soutes.', avncsVent: 'Ventilation de la baie électronique. OVRD : circuit de secours si fumée.',
};
const PB_LEGEND = '<p class="hl2">Lecture des voyants Airbus (« cockpit sombre ») : <b>aucun voyant</b> = situation normale. <b class="w">OFF blanc</b> = système volontairement coupé. <b class="b">ON bleu</b> = système normalement éteint, mis en marche. <b class="g">AVAIL vert</b> = disponible. <b class="a">FAULT ambre</b> = panne. <b class="r">FIRE rouge</b> = feu.</p>';
function ovhText(id) {
  let m, x = OVH_HELP[id];
  if (x) return x;
  if ((m = id.match(/^(adr|ir|prim|sec)(\d)$/))) return OVH_HELP[m[1]].replace('{n}', m[2]);
  if ((m = id.match(/^batEmer(\d)$/))) return OVH_HELP.batEmer.replace('{n}', m[1]);
  if ((m = id.match(/^gen(\d)([ab])$/))) return OVH_HELP.gen.replace('{n}', m[1] + m[2].toUpperCase()).replace('{m}', m[1]);
  if ((m = id.match(/^eng(\d)P([AB])$/))) return OVH_HELP.engP.replace('{p}', m[2]).replace('{m}', m[1]).replace('{c}', m[1] === '1' ? 'vert' : 'jaune');
  if ((m = id.match(/^eng(\d)Ag(\d)$/)) || id === 'apuAg') return OVH_HELP.ag;
  if ((m = id.match(/^(lp|rp)(\d)$/))) return OVH_HELP[m[1]].replace('{n}', m[2]);
  if ((m = id.match(/^ctr([LR])$/))) return OVH_HELP.ctr.replace('{s}', m[1] === 'L' ? 'côté gauche' : 'côté droit');
  if ((m = id.match(/^(pack|hotAir|engBleed|engAI|manStart|fadec)(\d)$/))) return OVH_HELP[m[1]].replace('{n}', m[2]);
  return '';
}
function ovhState(it) {
  const v = S.ovh[it.id];
  if (it.pos) return 'Position actuelle : <b>' + it.pos[v] + '</b> (choix : ' + it.pos.join(', ') + ').';
  if (it.t === 'knob') return 'Valeur actuelle : <b>' + v + '</b>.';
  if (it.t === 'mom') return 'Bouton à impulsion : il agit seulement pendant l\'appui.';
  const [u, d] = S.sys.elec.dc ? legends(it) : [null, null];
  const lit = [u, d].filter(Boolean).map(l => l[0]).join(' + ');
  const pos = it.t === 'guard' ? (UIC.covers[it.id] ? 'capot ouvert' : 'capot fermé') + ', bouton ' + (v ? 'poussé' : 'normal') : (v ? 'enfoncé (en service)' : 'relâché');
  return 'État : <b>' + pos + '</b>' + (it.norm ? ' · position normale : enfoncé' : '') + '. Voyants allumés : <b>' + (lit || 'aucun') + '</b>' + (S.sys.elec.dc ? '' : ' (pas de courant : voyants éteints)') + '.';
}

/* ---------- textes : autres commandes et zones ---------- */
const UI_HELP = {
  efisInfo: ['EFIS CP (panneau de commande des écrans)', 'Règle ce qu\'affichent le PFD et le ND du commandant : calage altimétrique, directeur de vol, écarts ILS, relief, mode et échelle de la carte.'],
  baroDisp: ['Calage altimétrique (BARO)', 'L\'altimètre mesure une pression et la convertit en altitude. Il faut lui donner la pression de référence : QNH (pression locale ramenée au niveau de la mer) près du sol, STD (1013 hPa) au-dessus de l\'altitude de transition. Les boutons − et + changent le QNH, STD bascule entre les deux. Si le calage n\'est pas changé au bon moment, il clignote sur le PFD.', () => 'Actuellement : <b>' + (S.efis.baroStd ? 'STD (1013)' : 'QNH ' + S.efis.qnh) + '</b>.'],
  pbFD: ['FD : directeur de vol', 'Affiche sur le PFD les barres vertes qui indiquent au pilote quelle assiette et quelle inclinaison prendre pour suivre les modes choisis. Quand le pilote auto est engagé, il suit lui-même ces ordres.', () => 'Directeur de vol : <b>' + (S.efis.fd ? 'affiché' : 'masqué') + '</b>.'],
  pbLS: ['LS : écarts ILS', 'Affiche sur le PFD les échelles d\'écart du faisceau ILS : losange horizontal = axe de piste (LOC), losange vertical = pente de descente (G/S). À activer en approche.', () => 'LS : <b>' + (S.efis.ls ? 'affiché' : 'masqué') + '</b>.'],
  pbTERR: ['TERR : relief sur le ND', 'Superpose le relief sur la carte : rouge = relief plus de 2 000 ft au-dessus de l\'avion, jaune = proche de ton altitude, vert = en dessous. Repose sur la base de relief de ce simulateur (≈ 10 km de précision).', () => 'Relief : <b>' + (S.efis.terr ? 'affiché' : 'masqué') + '</b>.'],
  ndModeDisp: ['Mode du ND', 'ROSE : rose des caps complète, avion au centre. ARC : vue vers l\'avant, la plus utilisée en vol. PLAN : carte orientée nord, centrée sur le point actif, pour vérifier la route.', () => 'Mode : <b>' + S.efis.mode + '</b>.'],
  ndRngDisp: ['Échelle du ND', 'Distance couverte par le rayon de l\'arc, en milles nautiques. De 0,5 à 5 NM au sol, le ND montre le plan de l\'aéroport et le trajet de roulage ; 20 à 40 NM en approche ; 160 à 640 NM en croisière.', () => 'Échelle : <b>' + S.efis.range + ' NM</b>.'],
  mwBtn: ['MASTER WARNING', 'Voyant rouge clignotant et sonnerie continue : alarme de niveau 3, danger immédiat (feu, décrochage, configuration dangereuse). Appuyer dessus éteint le voyant et le son ; la procédure reste affichée sur l\'EWD.', () => 'État : <b>' + (S.ecam.mw ? 'ALLUMÉ' : 'éteint') + '</b>.'],
  mcBtn: ['MASTER CAUTION', 'Voyant ambre et carillon simple : alarme de niveau 2, panne demandant une action sans urgence immédiate (pompe, générateur…). Appuyer pour l\'acquitter.', () => 'État : <b>' + (S.ecam.mc ? 'ALLUMÉ' : 'éteint') + '</b>.'],
  fcuInfo: ['AFS CP (FCU) : panneau du pilote automatique', 'C\'est ici que l\'on dit au pilote automatique et à l\'auto-manette quoi faire : vitesse, cap, altitude, vitesse verticale. Chaque bouton rotatif se pousse (PUSH = mode géré par le FMS, un point s\'affiche) ou se tire (PULL = mode sélecté, la valeur affichée).'],
  fcuSpd: ['Vitesse (SPD/MACH)', 'Vitesse cible de l\'auto-manette. PUSH : vitesse gérée par le FMS selon la phase (250 kt sous 10 000 ft, Mach 0,85 en croisière, vitesses d\'approche…). PULL : vitesse sélectée, celle affichée. SPD/MACH bascule entre nœuds et Mach.', () => 'Mode : <b>' + (S.fcu.spdMan ? 'géré' : 'sélecté ' + (S.fcu.machMode ? 'M.' + Math.round(S.fcu.mach * 100) : S.fcu.spd + ' kt')) + '</b>.'],
  fcuHdg: ['Cap (HDG)', 'PUSH : navigation gérée, l\'avion suit la route du FMS (mode NAV). PULL : cap sélecté (mode HDG), l\'avion vire vers la valeur affichée. Tourner avant de tirer prépare la valeur.', () => 'Mode latéral : <b>' + (S.fg.lat || '—') + '</b>.'],
  fcuAlt: ['Altitude (ALT)', 'Altitude autorisée : le pilote auto ne la dépassera jamais. Le bouton 100/1000 choisit le pas. PUSH : montée ou descente gérée (CLB/DES, en respectant le profil du FMS). PULL : montée ou descente ouverte (OP CLB/OP DES : pleine poussée ou ralenti, vitesse tenue par l\'assiette).', () => 'Altitude affichée : <b>' + S.fcu.alt + ' ft</b> · mode vertical : <b>' + (S.fg.vert || '—') + '</b>.'],
  fcuVs: ['Vitesse verticale (V/S)', 'PULL : l\'avion tient la vitesse verticale affichée (en pieds par minute). PUSH : mise en palier immédiate (V/S 0).', () => 'Mode : <b>' + (S.fg.vert === 'V/S' ? 'V/S ' + S.fcu.vs + ' ft/min' : 'inactif') + '</b>.'],
  pbAP1: ['AP 1 : pilote automatique 1', 'Engage le pilote automatique n° 1, au-dessus de 100 ft. Il suit les modes affichés dans le FMA. Il se déconnecte si l\'on force sur le manche ou avec la touche X (alarme « cavalry charge »).', () => 'AP1 : <b>' + (S.fcu.ap1 ? 'engagé' : 'désengagé') + '</b>.'],
  pbAP2: ['AP 2 : pilote automatique 2', 'Deuxième pilote automatique. Les deux ensemble ne sont possibles qu\'en approche ILS : ils se surveillent mutuellement (CAT 3 DUAL), ce qui permet l\'atterrissage automatique.', () => 'AP2 : <b>' + (S.fcu.ap2 ? 'engagé' : 'désengagé') + '</b>.'],
  pbATHR: ['A/THR : auto-manette', 'Gère automatiquement la poussée pour tenir la vitesse. Sur Airbus, les manettes ne bougent pas : on les pose sur le cran CL et l\'A/THR travaille entre ralenti et CL. Elle s\'arme au décollage et devient active quand on passe les manettes sur CL.', () => 'A/THR : <b>' + ({ off: 'éteinte', armed: 'armée', active: 'active' })[S.fg.athrState] + '</b>.'],
  pbLOC: ['LOC', 'Arme la capture de l\'axe de piste (localizer) uniquement, sans la pente.', () => ''],
  pbAPPR: ['APPR : approche', 'Arme la capture de l\'axe (LOC) et de la pente (G/S) de l\'ILS. Ils apparaissent en bleu dans le FMA, puis en vert une fois capturés. Avec AP1 + AP2, l\'avion se posera seul.', () => 'APPR : <b>' + (S.fcu.appr ? 'armé' : 'non armé') + '</b>.'],
  pbEXPED: ['EXPED : montée ou descente accélérée', 'Monte ou descend le plus vite possible, à une vitesse particulière. Rarement utilisé en exploitation normale.'],
  clock: ['Horloge', 'Heure UTC (temps universel, utilisé partout en aviation) et chronomètre ET : temps écoulé depuis le décollage.'],
  gearp: ['Train d\'atterrissage', 'Levier du train et ses voyants : triangles verts = train sorti et verrouillé, rouge = en mouvement ou non verrouillé, éteint = rentré. Le levier est bloqué au sol. Vitesse maximale pour manœuvrer le train : 250 kt.', () => 'Levier : <b>' + (S.ctl.gearDown ? 'DOWN' : 'UP') + '</b> · train ' + (S.sys.gear > 0.99 ? 'sorti' : S.sys.gear < 0.01 ? 'rentré' : 'en mouvement') + '.'],
  abBtns: ['AUTO BRK : freinage automatique', 'RTO : freinage maximal si on interrompt le décollage au-dessus de 72 kt. LO, 2, 3, HI : décélération automatique choisie à l\'atterrissage, déclenchée par la sortie des spoilers. On reprend la main en freinant aux palonniers.', () => 'Réglage : <b>' + ['OFF', 'RTO', 'LO', '2', '3', 'HI'][S.ctl.autobrk] + '</b>.'],
  pbBtv: ['A/SKID & N/W STRG', 'Antiblocage des freins et orientation de la roulette de nez. Toujours en service.'], pbBrkFan: ['BRK FAN', 'Ventilateurs de refroidissement des freins, utiles après un atterrissage court ou un long roulage.'],
  ecpBtns: ['ECP : panneau de commande ECAM', 'Choisit la page système affichée sur le SD (ENG, BLEED, PRESS, ELEC, HYD, FUEL, APU, COND, DOOR, WHEEL, F/CTL ; ALL les fait défiler). CLR efface une alarme lue, RCL rappelle les alarmes effacées, STS affiche l\'état des pannes, T.O CONFIG simule la mise en poussée pour vérifier la configuration, EMER CANC annule une alarme sonore.', () => 'Page affichée : <b>' + S.ecam.page + '</b>' + (S.ecam.autoPage ? ' (choisie automatiquement selon la phase)' : '') + '.'],
  stickPad: ['Mini-manche (sidestick)', 'Sur Airbus, le manche commande un facteur de charge et non directement les gouvernes. Lâché, l\'avion garde sa trajectoire et son inclinaison (jusqu\'à 33°). Vers le bas = cabrer (tirer), vers le haut = piquer (pousser). Les protections empêchent de décrocher ou de trop incliner (67° max).'],
  stickPad2: ['Manche tactile', 'Même rôle que le sidestick : glisse vers le BAS pour cabrer, vers le HAUT pour piquer, sur les côtés pour incliner. Relâché, il revient au centre et l\'avion garde sa trajectoire.'],
  infoPanel: ['Données de vol', 'Résumé des valeurs principales : vol, phase, vitesse et Mach, altitude et vario, distance et temps restants, carburant, masse, vitesses minimale (VLS) et maximale (VMAX) du moment.'],
  thrTrack: ['Manettes de poussée', 'Crans : REV (inversion de poussée au sol), IDLE (ralenti), CL (montée : position normale en vol, l\'A/THR y travaille), FLX/MCT (poussée réduite au décollage, ou maximale continue en vol avec un moteur en panne), TOGA (poussée maximale, décollage ou remise des gaz).', () => 'Position : <b>' + ({ '-20': 'REV', 0: 'IDLE', 25: 'CL', 35: 'FLX/MCT', 45: 'TOGA' }[String(Math.round(S.ctl.tla[0]))] || Math.round(S.ctl.tla[0]) + '°') + '</b>.'],
  master1: ['ENG MASTER 1', 'Ouvre (ON) ou coupe (OFF) le carburant du moteur 1. Avec ENG MODE sur IGN START, le passer sur ON lance le démarrage automatique ; le passer sur OFF arrête le moteur.', () => 'Position : <b>' + (S.ctl.engMaster[0] ? 'ON' : 'OFF') + '</b> · moteur ' + ({ off: 'arrêté', start: 'en démarrage', run: 'en marche', shutdown: 'en arrêt' })[S.eng[0].st] + '.'],
  master2: ['ENG MASTER 2', 'Comme ENG MASTER 1, pour le moteur 2. On démarre souvent le moteur 2 en premier.', () => 'Position : <b>' + (S.ctl.engMaster[1] ? 'ON' : 'OFF') + '</b> · moteur ' + ({ off: 'arrêté', start: 'en démarrage', run: 'en marche', shutdown: 'en arrêt' })[S.eng[1].st] + '.'],
  engModeDisp: ['ENG MODE', 'CRANK : fait tourner le moteur sans carburant (ventilation, maintenance). NORM : position normale. IGN START : démarrage automatique, et allumage continu (pluie forte, turbulence).', () => 'Position : <b>' + ['CRANK', 'NORM', 'IGN START'][S.ctl.engMode] + '</b>.'],
  spdbrkSteps: ['Aérofreins et spoilers', 'RET : rentrés. 1/2 et FULL : aérofreins en vol pour descendre ou ralentir plus vite. ARM : spoilers armés, ils sortiront seuls au toucher des roues ou si on interrompt le décollage, pour « tuer » la portance.', () => 'Position : <b>' + (S.ctl.spdArmed ? 'ARM' : S.ctl.spd >= 1 ? 'FULL' : S.ctl.spd > 0 ? '1/2' : 'RET') + '</b>.'],
  flapSteps: ['Levier des becs et volets', '0 : lisse (croisière). 1 : becs (et volets au sol : 1+F). 2, 3, FULL : de plus en plus de portance et de traînée pour voler lentement. Chaque cran a une vitesse maximale (VFE), visible sur la bande vitesse du PFD.', () => 'Levier : <b>' + ['0', '1', '2', '3', 'FULL'][S.ctl.flapsLever] + '</b>' + (Math.abs(S.sys.flaps - S.ctl.flapsLever) > 0.05 ? ' (en mouvement)' : '') + '.'],
  parkBtn: ['Frein de parking', 'Bloque les roues à l\'arrêt. Doit être serré au poste et pendant les démarrages, desserré avant de rouler ou de mettre les gaz (sinon alarme CONFIG PARK BRK ON).', () => 'État : <b>' + (S.ctl.park ? 'serré' : 'desserré') + '</b>.'],
  rudDisp: ['Trim de direction', 'Décale le neutre de la gouverne de direction, surtout utile avec un moteur en panne. RESET le remet à zéro.'],
  vhfAct: ['RMP : panneau radio', 'Choisit les fréquences radio : à gauche la fréquence active, à droite celle en attente ; la flèche les échange. Sur ce simulateur, les échanges radio s\'affichent dans l\'onglet Radio & équipage.'],
  xpdrDisp: ['Transpondeur (ATC)', 'Répond aux radars du contrôle avec un code à 4 chiffres attribué par le contrôleur (clairance). Codes spéciaux : 7700 urgence, 7600 panne radio, 7500 détournement. IDENT fait clignoter l\'avion sur l\'écran du contrôleur.', () => 'Code : <b>' + UIC.xpdr.code + '</b> · mode ' + ['STBY', 'AUTO', 'ON'][UIC.xpdr.mode] + '.'],
  wxrDisp: ['Radar météo', 'Détecte les zones de précipitations devant l\'avion pour contourner les orages. (Pas de météo simulée ici.)'],
  gpuBtn: ['Groupe de parc (GPU)', 'Branche ou débranche le groupe électrique au sol, au poste et avion arrêté.'], doorsBtn: ['Portes', 'Ouvre ou ferme les portes au poste. Elles se ferment toutes seules quand le BEACON est allumé.'],
  tiller: ['Volant de roulage (tiller)', 'Oriente la roulette de nez au sol, jusqu\'à 70° à basse vitesse : c\'est avec lui qu\'on tourne en roulant. Au-dessus de 80 kt, on corrige l\'axe au palonnier.'],
  tbAutoTaxi: ['Roulage auto', 'Fait suivre à l\'avion le trajet magenta du ND (parking → piste au départ, piste → parking à l\'arrivée) à 15 kt, 6 à 8 kt dans les virages. Fonction d\'aide du simulateur (elle n\'existe pas sur le vrai A350).'],
  btnTutor: ['Mode pédagogique', 'Lance le vol complet guidé du cockpit froid jusqu\'au parking : une bulle numérotée montre chaque commande, explique quoi faire, pourquoi, quoi regarder et qui fait quoi.'],
  scenSel: ['Départ', 'Choisis où commence la simulation : cockpit froid au parking (vol complet), aligné sur la piste, en croisière ou en approche finale.'],
  routeSel: ['Vol', 'Trajet : Saint-Denis (FMEE) vers Orly (LFPO) ou Charles de Gaulle (LFPG), et retour. Appuie ensuite sur Charger.'],
  rateLbl: ['Accélération du temps', 'Multiplie la vitesse de la simulation (×1 = temps réel, environ 11 h de vol). Jusqu\'à ×256 en croisière sous pilote automatique ; limitée près du sol pour la sécurité.'],
  failSel: ['Pannes', 'Déclenche une panne pour t\'entraîner : feu moteur, panne moteur, générateur, pompe hydraulique. L\'ECAM affiche alors la procédure à suivre sur l\'EWD.'],
  radioBar: ['Bandeau radio', 'Dernier message radio ou équipage. Quand le contrôleur te donne une instruction, le bouton Collationner apparaît : tu répètes l\'instruction comme l\'exige la réglementation (sinon le copilote le fait).'],
  guide: ['Guide', 'Prochaine étape du vol. Montrer t\'amène à la bonne commande ; Passer la saute (elle sera reproposée plus tard si elle n\'a pas été faite).'],
  touchBarInfo: ['Barre de pilotage', 'Commandes principales sous les doigts : manche, gaz par crans ou par petits pas (gaz fin), volets, train, AP, freins, inverseurs, frein de parking, roulage auto et volant de roulage. Les valeurs clés s\'affichent en dessous.'],
  mfd: ['MFD : écran du FMS', 'Le FMS (système de gestion du vol) calcule la route, le carburant et les performances. INIT : route et niveau ; FUEL&LOAD : masses et carburant ; PERF : vitesses de décollage et d\'approche ; F-PLN : plan de vol point par point ; POSITION : position et prévisions.'],
};
/* Zones des écrans (coordonnées dans un écran de 290 × 290) */
function zoneHelp(cv, x, y) {
  const fmaCol = ['A/THR (poussée)', 'mode vertical', 'mode latéral', 'capacité d\'approche', 'engagement AP/FD/A/THR'];
  if (cv === 'cvPFD') {
    if (y < 42) { const c = Math.min(4, Math.floor(x / 58)); return ['FMA : ' + fmaCol[c], 'Le FMA (Flight Mode Annunciator), en haut du PFD, dit ce que font l\'auto-manette et le pilote auto. Vert = mode actif, bleu = mode armé (il s\'enclenchera tout seul), blanc = message ou engagement. Colonne pointée : ' + fmaCol[c] + '. Toute action sur le FCU se vérifie ici : « lire le FMA » est un réflexe de base.', { x: c * 58, y: 0, w: 58, h: 42 }, 'Modes actifs : <b>' + [S.fg.athrMode || '—', S.fg.vert || '—', S.fg.lat || '—'].join(' | ') + '</b>' + (S.fg.vertArm || S.fg.latArm ? ' · armés : ' + [S.fg.vertArm, S.fg.latArm].filter(Boolean).join(', ') : '')]; }
    if (x < 62 && y > 50 && y < 230) return ['Bande de vitesse', 'Vitesse indiquée en nœuds (repère jaune = vitesse actuelle). Triangle magenta = vitesse gérée par le FMS, bleu = sélectée. Barres rouge et noir en haut = VMAX (à ne pas dépasser) ; bande ambre en bas = VLS (vitesse minimale de manœuvre) ; plus bas, protections contre le décrochage. Flèche jaune = vitesse dans 10 s. Au décollage : 1 bleu = V1, point bleu = VR. Point vert = vitesse de finesse max en lisse ; F et S = vitesses pour rentrer les volets. Le Mach s\'affiche dessous au-dessus de 0,5.', { x: 12, y: 50, w: 50, h: 180 }, 'Vitesse : <b>' + Math.round(ias()) + ' kt</b> · VLS ' + Math.round(speeds().vls) + ' · VMAX ' + Math.round(speeds().vmax)];
    if (x > 205 && x < 256 && y > 50 && y < 245) return ['Bande d\'altitude', 'Altitude en pieds (centaines en gros, dizaines en petit dans la fenêtre jaune). Valeur bleue/magenta en haut ou en bas = altitude du FCU. Ruban rouge = sol. Dessous : calage altimétrique (QNH ou STD).', { x: 208, y: 50, w: 48, h: 195 }, 'Altitude : <b>' + Math.round(S.ac.alt / FT) + ' ft</b> · hauteur radio ' + Math.round(radAlt()) + ' ft'];
    if (x >= 256 && y > 60 && y < 230) return ['Variomètre', 'Vitesse verticale en milliers de pieds par minute. Le chiffre affiché en haut ou en bas est en centaines. En approche sur une pente de 3°, environ −700 ft/min. Vert normal ; ambre si excessif près du sol.', { x: 256, y: 60, w: 32, h: 170 }, 'Vario : <b>' + Math.round(S.ac.vs / FT * 60) + ' ft/min</b>'];
    if (y > 236) return ['Échelle de cap', 'Cap magnétique (ici vrai, simplification) en dizaines de degrés. Trait jaune = cap actuel, triangle bleu = cap sélecté au FCU, trait magenta = axe de piste ILS.', { x: 66, y: 236, w: 126, h: 30 }, 'Cap : <b>' + pad3(S.ac.psi * R2D) + '°</b>'];
    return ['Horizon artificiel', 'Ciel bleu, sol marron : l\'assiette (nez haut ou bas, en degrés) et l\'inclinaison (échelle en arc, triangle jaune). Maquette jaune = l\'avion. Barres vertes = directeur de vol : place la maquette dessus pour suivre les modes. Chiffre vert dessous = hauteur radio sous 2 500 ft. Losanges magenta = écarts ILS (LS).', { x: 64, y: 60, w: 128, h: 150 }, 'Assiette <b>' + (S.ac.theta * R2D).toFixed(1) + '°</b> · inclinaison <b>' + Math.round(S.ac.phi * R2D) + '°</b>'];
  }
  if (cv === 'cvND') {
    if (y < 30 && x < 110) return ['Vitesses sol et vraie', 'GS = vitesse sol (par rapport au terrain), TAS = vitesse vraie (par rapport à l\'air). Elles sont égales sans vent. Dessous : direction et force du vent (calme ici).', { x: 0, y: 0, w: 110, h: 30 }, 'GS <b>' + Math.round(S.ac.V / KT) + ' kt</b>'];
    if (y < 55 && x > 180) return ['Prochain point', 'Nom du point actif de la route (en blanc sur la carte), sa route en degrés, sa distance et l\'heure UTC de passage prévue.', { x: 180, y: 0, w: 110, h: 55 }, S.nav ? 'Vers <b>' + S.nav.w.id + '</b> : ' + (S.nav.dist / NM).toFixed(1) + ' NM' : ''];
    return ['ND : écran de navigation', 'La carte vue du dessus. Avion jaune ; route du FMS en vert ; point actif en blanc ; contraintes d\'altitude en magenta ; T/D = début de descente ; aéroports en étoile magenta. Avec TERR : relief en couleur. Au sol en petite échelle : plan de l\'aéroport et trajet de roulage en pointillés magenta.', { x: 0, y: 0, w: 290, h: 290 }, 'Mode <b>' + S.efis.mode + '</b>, échelle ' + S.efis.range + ' NM'];
  }
  if (cv === 'cvEWD') {
    if (y < 98) return ['N1 et limite de poussée', 'Régime de la soufflante (N1, en %) de chaque moteur : c\'est le paramètre de poussée. Aiguille verte = valeur actuelle, point bleu = position des manettes. En haut au centre : limite de poussée du moment (TOGA, FLX, CLB, MCT) et sa valeur.', { x: 0, y: 0, w: 290, h: 98 }, 'N1 <b>' + S.eng[0].n1.toFixed(1) + ' / ' + S.eng[1].n1.toFixed(1) + ' %</b>'];
    if (y < 165) return ['EGT', 'Température des gaz d\'échappement, en °C. Elle grimpe au démarrage puis suit la poussée. Zone rouge = limite : un dépassement endommage le moteur (démarrage « chaud »).', { x: 0, y: 98, w: 290, h: 67 }, 'EGT <b>' + Math.round(S.eng[0].egt) + ' / ' + Math.round(S.eng[1].egt) + ' °C</b>'];
    if (y < 196) return ['Carburant et volets', 'FOB : carburant total à bord, en kg. À droite : position des becs (S) et volets (F), et configuration (1+F, 2, 3, FULL). Bleu = en mouvement.', { x: 0, y: 165, w: 290, h: 31 }, 'FOB <b>' + fmt(Math.round(fob())) + ' kg</b>'];
    return ['Alertes et mémos ECAM', 'Partie basse de l\'EWD. À gauche : alertes (rouge = urgence, ambre = panne) et procédure à suivre (bleu = action à faire, blanc = faite). À droite ou dessous : mémos verts (systèmes temporairement en service), et les check-lists T.O et LDG : une ligne bleue = encore à faire.', { x: 0, y: 196, w: 290, h: 94 }, S.ecam.alerts.length ? 'Alertes : <b>' + S.ecam.alerts.map(a => a.title).join(', ') + '</b>' : 'Aucune alerte'];
  }
  if (cv === 'cvSD') {
    if (y > 256) return ['Données permanentes du SD', 'TAT : température totale (air réchauffé par la vitesse), SAT : température de l\'air ambiant, heure UTC, GW : masse actuelle de l\'avion, GWCG : centrage (position du centre de gravité).', { x: 0, y: 258, w: 290, h: 32 }, 'Masse : <b>' + fmt(Math.round(S.ac.mass)) + ' kg</b>'];
    const P = { ENG: 'paramètres secondaires des moteurs : N2, N3, carburant consommé et débit, huile, vibrations, état du démarrage', BLEED: 'circuit d\'air : prélèvements moteurs et APU, vanne d\'intercommunication, packs', PRESS: 'pressurisation : altitude et variation de la cabine, différence de pression, vanne de sortie', ELEC: 'réseau électrique : générateurs, prises de parc, barres AC et DC, batteries', HYD: 'circuits hydrauliques vert et jaune : pression, pompes, réservoirs', FUEL: 'carburant : quantités par réservoir, pompes, intercommunication, carburant consommé', APU: 'APU : régime, température, générateur et prélèvement d\'air', COND: 'températures des zones cockpit et cabine', DOOR: 'état des portes et des toboggans', WHEEL: 'train, températures des freins et freinage automatique', 'F/CTL': 'gouvernes : ailerons, spoilers, profondeur, direction, état des PRIM et SEC' };
    return ['SD : écran systèmes, page ' + S.ecam.page, 'Le SD dessine un système de l\'avion. Page affichée : ' + (P[S.ecam.page] || '') + '. Elle change seule selon la phase ou une panne, ou à la main avec l\'ECP. Vert = normal, ambre = anomalie.', { x: 0, y: 0, w: 290, h: 256 }, ''];
  }
  if (cv === 'cvISIS') return ['ISIS : instrument de secours', 'Petit instrument autonome, alimenté par batterie : horizon, vitesse et altitude. Il reste disponible si tous les grands écrans tombent en panne.', null, ''];
  if (cv === 'cvWin' || cv === 'cvWin3d') return ['Vue extérieure 3D', 'Ce que tu vois par le pare-brise : relief et images satellite réels (NASA Blue Marble, ≈ 10 km de précision), courbure de la Terre, pistes avec marquages et feux. Le PAPI (4 feux à gauche de la piste) indique la pente : 2 blancs et 2 rouges = bonne pente.', null, 'Altitude <b>' + Math.round(S.ac.alt / FT) + ' ft</b>'];
  return null;
}

/* ---------- résolution de l'élément touché ---------- */
function helpResolve(el, ev) {
  if (!el || el.closest('#helpFab, #helpDlg2')) return null;
  const cvs = el.closest('canvas');
  if (cvs && /^cv/.test(cvs.id)) {
    const r = cvs.getBoundingClientRect(), W = cvs.id.startsWith('cvWin') ? 1280 : cvs.id === 'cvISIS' ? 120 : 290;
    const H = cvs.id.startsWith('cvWin') ? 320 : W;
    const x = (ev.clientX - r.left) / r.width * W, y = (ev.clientY - r.top) / r.height * H;
    const z = zoneHelp(cvs.id, x, y); if (!z) return null;
    const rect = z[2] ? { left: r.left + z[2].x / W * r.width, top: r.top + z[2].y / H * r.height, width: z[2].w / W * r.width, height: z[2].h / H * r.height } : r;
    return { key: cvs.id + ':' + z[0], title: z[0], body: '<p>' + z[1] + '</p>', state: () => zoneHelp(cvs.id, x, y)[3], el: cvs, rect, where: { cvPFD: 'PFD · écran de pilotage principal', cvND: 'ND · écran de navigation', cvEWD: 'EWD · écran moteurs et alertes', cvSD: 'SD · écran systèmes', cvISIS: 'Instrument de secours', cvWin: 'Pare-brise', cvWin3d: 'Pare-brise' }[cvs.id] };
  }
  const it = el.closest('.it');
  if (it && it.id.startsWith('ctl-')) {
    const id = it.id.slice(4), d = OVH_ITEMS[id];
    if (d) {
      const isPb = ['pb', 'ext', 'apustart', 'agent', 'guard'].includes(d.t);
      const kind = { pb: 'Bouton-poussoir à voyants', ext: 'Bouton-poussoir de prise de parc', apustart: 'Bouton-poussoir de démarrage', agent: 'Bouton de percussion d\'extincteur', guard: 'Bouton sous capot de protection', sel: 'Sélecteur rotatif', tog: 'Interrupteur à levier', knob: 'Bouton de réglage', mom: 'Bouton à impulsion' }[d.t];
      return { key: 'ovh:' + id, title: d.l, where: 'Panneau plafonnier · ' + d.panel, el: it,
        body: `<p><b>${kind}.</b> ${ovhText(id)}</p><p class="muted2"><b>Le panneau ${d.panel}</b> : ${PANEL_HELP[d.panel] || ''}</p>${isPb ? PB_LEGEND : ''}`, state: () => ovhState(d) };
    }
  }
  const pnl = el.closest('.opnl');
  if (pnl) return panelGroup(pnl);
  const ecp = el.closest('#ecpBtns .k');
  if (ecp) { const p = ecp.dataset.page; const T = { CLR: 'Efface l\'alerte lue et passe à la suivante.', RCL: 'Rappelle les alertes effacées.', STS: 'Affiche l\'état des systèmes et les limitations après panne.', 'T.O CONFIG': 'Simule la mise des gaz pour vérifier la configuration de décollage : volets, aérofreins, frein de parking. Le mémo T.O doit afficher « T.O CONFIG NORMAL ».', 'EMER CANC': 'Arrête une alarme sonore et le voyant MASTER.', ALL: 'Fait défiler toutes les pages système.' }; return { key: 'ecp:' + p, title: 'ECP · ' + p, where: 'Panneau de commande ECAM', el: ecp, body: '<p>' + (T[p] || 'Affiche la page système ' + p + ' sur le SD. Appuyer une deuxième fois revient au choix automatique selon la phase.') + '</p><p class="muted2">' + UI_HELP.ecpBtns[1] + '</p>' }; }
  const mt = el.closest('#mfdTabs button');
  if (mt) return { key: 'mfd:' + mt.textContent, title: 'FMS · page ' + mt.textContent, where: 'MFD du pédestal', el: mt, body: '<p>' + UI_HELP.mfd[1] + '</p>' };
  const cc = el.closest('.ccard');
  if (cc) { const c = CALCS.find(k => 'cc-' + k.id === cc.id); if (c) return { key: 'calc:' + c.id, title: c.t, where: 'Onglet Calculs', el: cc, body: `<p>${c.why}</p><p class="cf">${c.f}</p><p class="muted2">Les champs marqués ● se remplissent avec les valeurs du vol tant que « Valeurs du vol en direct » est cochée. Décoche-la pour tester tes propres valeurs.</p>` }; }
  const tab = el.closest('.tab');
  if (tab) { const T = { main: 'La vue pilote : pare-brise 3D, glareshield, les quatre grands écrans et le panneau inférieur.', ovhd: 'Le panneau plafonnier : tous les systèmes de l\'avion (électricité, carburant, air, feux…).', ped: 'Le pédestal entre les pilotes : FMS, manettes, démarrage moteurs, volets, aérofreins, radios.', radio: 'Les échanges radio avec le contrôle et les conversations du cockpit et de la cabine.', log: 'Le journal de bord : heures, événements, carburant et carnet de vol.', calc: 'Tous les calculs du vol, avec formules et valeurs en direct.' }; return { key: 'tab:' + tab.dataset.view, title: 'Onglet ' + tab.textContent, where: 'Navigation', el: tab, body: '<p>' + T[tab.dataset.view] + '</p>' }; }
  // éléments identifiés
  let node = el;
  while (node && node !== document.body) {
    const k = node.id && UI_HELP[node.id] ? node.id : node.classList && [...node.classList].find(c => UI_HELP[c]);
    if (k) { const h = UI_HELP[k]; return { key: 'ui:' + k, title: h[0], where: 'Cockpit', el: node, body: '<p>' + h[1] + '</p>', state: h[2] }; }
    const G = node.matches && GROUP_HELP.find(g => node.matches(g.sel)); if (G) return groupHelp(G, node);
    if (node.dataset && node.dataset.act) {
      const map = { 'tla-up': 'thrTrack', 'tla-dn': 'thrTrack', 'tla-fine+': 'thrTrack', 'tla-fine-': 'thrTrack', 'tla-toga': 'thrTrack', 'tla-flx': 'thrTrack', 'tla-cl': 'thrTrack', 'tla-idle': 'thrTrack', 'tla-rev': 'thrTrack', 'tb-rev': 'thrTrack', 'flap+': 'flapSteps', 'flap-': 'flapSteps', gear: 'gearp', ap1: 'pbAP1', park: 'parkBtn', 'taxi-auto': 'tbAutoTaxi', athrdisc: 'pbATHR' };
      const k2 = map[node.dataset.act]; if (k2) { const h = UI_HELP[k2]; return { key: 'act:' + node.dataset.act, title: node.textContent.trim() + ' — ' + h[0], where: 'Commande', el: node, body: '<p>' + h[1] + '</p>', state: h[2] }; }
    }
    node = node.parentElement;
  }
  const lbl = (el.textContent || '').trim().slice(0, 40);
  return { key: 'gen:' + lbl, title: lbl || 'Élément', where: 'Page', el, body: '<p>Pas encore de fiche détaillée pour cet élément. Essaie de double-taper sur le bouton ou le bloc juste autour.</p>' };
}

/* ---------- blocs : explications groupées ---------- */
const GROUP_HELP = [
  { sel: '.efis', t: 'EFIS CP : réglages des écrans', i: 'Ce bloc règle ce qu\'affichent le PFD et le ND du commandant.', k: ['baroDisp', 'pbFD', 'pbLS', 'pbTERR', 'ndModeDisp', 'ndRngDisp'] },
  { sel: '.masters', t: 'Voyants maîtres', i: 'Les deux grands voyants qui attirent l\'attention sur toute nouvelle alarme ECAM.', k: ['mwBtn', 'mcBtn'] },
  { sel: '#fcu', t: 'AFS CP (FCU) : pilote automatique', i: 'Le pavé du pilote automatique et de l\'auto-manette. Chaque bouton rotatif se pousse (PUSH = géré par le FMS, un point s\'affiche) ou se tire (PULL = sélecté, la valeur affichée). Toute action se vérifie ensuite dans le FMA en haut du PFD.', k: ['fcuSpd', 'fcuHdg', 'pbLOC', 'pbAP1', 'pbAP2', 'pbATHR', 'fcuAlt', 'pbEXPED', 'pbAPPR', 'fcuVs'] },
  { sel: '.dus', t: 'Les quatre grands écrans', i: 'De gauche à droite : PFD (pilotage), ND (navigation), EWD (moteurs et alertes), SD (systèmes). Touche un écran précis pour l\'explication de chacune de ses zones.', z: [['cvPFD', 30, 140], ['cvPFD', 128, 140], ['cvPFD', 230, 140], ['cvND', 145, 150], ['cvEWD', 145, 50], ['cvEWD', 145, 240], ['cvSD', 145, 120]] },
  { sel: '.abrk', t: 'Freins', i: 'Freinage automatique et systèmes de freins.', k: ['abBtns', 'pbBtv', 'pbBrkFan'] },
  { sel: '.ecp', t: 'ECP : panneau de commande ECAM', i: 'Choix de la page système et gestion des alarmes.', k: ['ecpBtns'] },
  { sel: '.thr', t: 'Manettes de poussée', i: 'Les deux manettes et leurs crans. Les boutons à droite les placent directement sur un cran.', k: ['thrTrack', 'pbATHR'] },
  { sel: '.engp', t: 'Panneau moteurs (pédestal)', i: 'Démarrage et arrêt des moteurs. Les voyants FIRE (rouge) et FAULT (ambre) au-dessus de chaque interrupteur signalent un feu ou un problème de démarrage.', k: ['master1', 'engModeDisp', 'master2'] },
  { sel: '.levers2', t: 'Leviers du pédestal', i: 'Aérofreins, volets, frein de parking et trim de direction.', k: ['spdbrkSteps', 'flapSteps', 'parkBtn', 'rudDisp'] },
  { sel: '.radios', t: 'Radios et services au sol', i: 'Communication, transpondeur, radar météo et services au sol.', k: ['vhfAct', 'xpdrDisp', 'wxrDisp', 'gpuBtn', 'doorsBtn'] },
  { sel: '.mfd', t: 'MFD : écran du FMS', i: UI_HELP.mfd[1], k: [] },
  { sel: '.touchbar', t: 'Barre de pilotage', i: UI_HELP.touchBarInfo[1], k: ['stickPad2', 'thrTrack', 'flapSteps', 'gearp', 'pbAP1', 'parkBtn', 'tbAutoTaxi', 'tiller'] },
  { sel: '.ctrls', t: 'Menus du haut', i: 'Réglages de la simulation.', k: ['btnTutor', 'routeSel', 'scenSel', 'rateLbl', 'failSel'] },
];
function groupHelp(G, node) {
  let list = (G.k || []).map(k => UI_HELP[k] ? `<dt>${UI_HELP[k][0]}</dt><dd>${UI_HELP[k][1]}</dd>` : '').join('');
  if (G.z) list = G.z.map(([cv, x, y]) => { const z = zoneHelp(cv, x, y); return z ? `<dt>${z[0]}</dt><dd>${z[1]}</dd>` : ''; }).join('');
  return { key: 'grp:' + G.sel, title: G.t, where: 'Bloc', el: node, body: `<p>${G.i}</p>${list ? '<dl class="hlist">' + list + '</dl>' : ''}` };
}
function panelGroup(pnl) {
  const t = pnl.querySelector('h3').textContent, P = OVH_DEF.find(p => p.title === t);
  const list = P ? P.items.map(d => `<dt>${d.l}</dt><dd>${ovhText(d.id)}</dd>`).join('') : '';
  return { key: 'panel:' + t, title: 'Panneau ' + t, where: 'Panneau plafonnier', el: pnl, body: `<p>${PANEL_HELP[t] || ''}</p><dl class="hlist">${list}</dl>${PB_LEGEND}` };
}

/* ---------- « ? » puis un tap sur l'élément ---------- */
function helpArm(on) {
  HELP.pick = on;
  $('helpFab').classList.toggle('pick', on);
  $('helpFab').setAttribute('aria-pressed', on ? 'true' : 'false');
  document.body.classList.toggle('help-picking', on);
  $('helpHint').hidden = !on;
}
function helpShow(h) {
  if (!h) return;
  HELP.sel = h;
  // bref encadré orange sur l'élément choisi
  const r = h.rect || h.el.getBoundingClientRect(), box = $('helpSel');
  Object.assign(box.style, { left: (r.left - 4) + 'px', top: (r.top - 4) + 'px', width: (r.width + 8) + 'px', height: (r.height + 8) + 'px' });
  box.hidden = false; clearTimeout(HELP.selT); HELP.selT = setTimeout(() => box.hidden = true, 1500);
  $('hTitle').textContent = h.title; $('hWhere').textContent = h.where || '';
  let st = ''; try { st = h.state ? h.state() : ''; } catch (e) { }
  $('hBody').innerHTML = h.body + (st ? `<div class="hstate"><span>En ce moment</span>${st}</div>` : '');
  // bouton « tout le bloc » quand l'élément fait partie d'un bloc
  const pnl = h.el.closest && h.el.closest('.opnl');
  const G = h.el.closest && GROUP_HELP.find(g => h.el.closest(g.sel) && !h.key.startsWith('grp:'));
  HELP.parent = h.key.startsWith('ovh:') && pnl ? panelGroup(pnl) : G ? groupHelp(G, h.el.closest(G.sel)) : null;
  $('hGroup').hidden = !HELP.parent; if (HELP.parent) $('hGroup').textContent = 'Tout le bloc : ' + HELP.parent.title.replace(/^Panneau /, '');
  try { if (!$('helpDlg2').open) $('helpDlg2').showModal(); } catch (e) { $('helpDlg2').setAttribute('open', ''); }
}
function helpTrack() { }
function helpInit() {
  // en mode aide, rien n'est actionné : on bloque le geste et on ouvre l'explication
  const stop = ev => { ev.preventDefault(); ev.stopImmediatePropagation(); };
  // on arrête la propagation (manche, volant, manettes réagissent au pointerdown) sans annuler le geste,
  // sinon les téléphones ne génèrent plus le « click » qui ouvre l'explication
  ['pointerdown', 'mousedown', 'touchstart'].forEach(t => document.addEventListener(t, ev => {
    if (HELP.pick && !ev.target.closest('#helpFab, #helpDlg2')) ev.stopImmediatePropagation();
  }, { capture: true }));
  document.addEventListener('click', ev => {
    if (!HELP.pick || ev.target.closest('#helpFab, #helpDlg2')) return;
    stop(ev);
    helpArm(false);
    helpShow(helpResolve(ev.target, ev));
  }, true);
  $('helpFab').onclick = () => helpArm(!HELP.pick);
  $('hGroup').onclick = () => { if (HELP.parent) helpShow(HELP.parent); };
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && HELP.pick) helpArm(false); });
}
