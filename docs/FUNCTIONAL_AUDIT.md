# FUNCTIONAL_AUDIT — Diagnostic du prototype v0

> Version 0.1 — 31/10/2026. Source : document d'audit validé (Claude Docs « A350 Flight Simulator — Audit du prototype et plan de refonte Windows », révision 13), converti ici en Markdown.
> Auto-audit : rédigé par l'auteur du prototype, à faire relire par une autre personne avant la phase 1.

## 0. Synthèse

**Verdict.** Le prototype est une bonne maquette pédagogique, mais pas un simulateur de systèmes. Il permet un vol complet FMEE → Paris de bout en bout : roulage, décollage, croisière, descente gérée, atterrissage automatique et retour au poste. En revanche, sur les 100 commandes du plafonnier, seules 38 environ agissent réellement sur un modèle, environ 18 ne servent qu'à des mémos ou au guide, et 44 sont purement visuelles.

Le code (4 679 lignes, un seul fichier HTML de 900 Ko dont 550 Ko de données intégrées) repose sur un état global mutable, sans types, sans module, sans tests automatisés versionnés. Il ne faut pas le porter tel quel : il faut en extraire les acquis (modèle de vol réglé, contenus pédagogiques, données) vers une architecture neuve, testable et hors ligne.

Recommandation : Tauri 2 + React + TypeScript, avec un moteur de simulation en TypeScript pur exécuté dans un Web Worker, et les données de l'avion décrites dans des fichiers séparés. Premier jalon vérifiable : le moteur actuel porté en TypeScript, avec le même vol de référence FMEE → LFPG rejoué automatiquement en test et les mêmes résultats.

## 1. Diagnostic du prototype actuel

### Matrice fonctionnelle

État : **O** opérationnel (modèle + effet + testé), **P** partiel, **V** visuel seulement.

| Fonctionnalité | État | Problème | Amélioration |
|---|---|---|---|
| Modèle de vol | P | Point matériel 3 degrés de liberté, assiette cinématique, pas de moments ni de dérapage. Atmosphère standard, aucun vent | Modèle 6 degrés de liberté simplifié, vent et turbulence, coefficients documentés |
| Lois de commandes | P | Loi normale approchée (facteur de charge, stabilité de trajectoire, protections). Pas de loi alternate ni direct : PRIM OFF ne fait qu'un message ECAM | Machine d'état des lois, liée aux pannes PRIM, SEC, hydrauliques et ADIRS |
| Moteurs Trent XWB | P | 3 arbres, démarrage, EGT, débit : valeurs empiriques. Panne moteur sans dissymétrie de poussée (aucun lacet) | Modèle par moteur avec moment de lacet, huile, vibrations et anomalies de démarrage |
| Électricité | P | Sources et deux barres AC. Les grands écrans tombent si aucune AC, mais pas de graphe consommateur → barre | Graphe sources → contacteurs → barres → équipements, avec propagation des pannes |
| Hydraulique | P | Circuits vert et jaune à 5 000 psi. Effets limités : vitesse des volets et du train, AP | Dépendances par gouverne, freins, roulette de nez, accumulateurs |
| Carburant | P | Réservoirs, transfert du centre, intercommunication. Les pompes d'aile n'alimentent rien : leur coupure ne fait qu'une alerte | Alimentation par aspiration et pression, extinction moteur liée à l'alimentation |
| Pneumatique, climatisation, pressurisation | P | Conduits, packs, altitude cabine : lois simplifiées | Bilan d'air et de débit, vannes de sortie, limites de pression différentielle |
| Feu | P | Feu moteur et APU, bouteilles, procédure ECAM | Détection par boucles, test FIRE, conséquences sur les systèmes |
| Antigivrage, essuie-glaces, oxygène, évacuation, éclairage | V | Commandes sans modèle : pas de givrage ni de météo | Modèle de givrage lié à la météo, sinon étiqueter « visuel » |
| FMS et MFD | P | Route orthodromique avec points fictifs (GC01…). Pas de voies aériennes, SID, STAR, attentes ni contraintes respectées | Base de navigation ouverte, procédures, contraintes et prédictions |
| Pilote auto et auto-manette | P | SRS, CLB, ALT, DES géré, V/S, LOC/G/S, LAND, FLARE, ROLL OUT fonctionnent. EXPED et remise des gaz approximatifs | Logique de modes documentée par transitions, tests par mode |
| ILS et approches | P | Faisceau ILS géométrique, fréquences fictives. Ni RNAV ni approche de non-précision | Approches définies par données, RNP et non-précision |
| ECAM | P | Une vingtaine d'alertes et de mémos, libellés approximatifs | Catalogue d'alertes avec priorités, inhibitions par phase, pages STATUS |
| Écrans PFD, ND, EWD, SD, ISIS | P | Lisibles et dynamiques, mais l'A350 a 6 écrans identiques dont les 2 extérieurs servent à l'OIS, pilotés par 2 KCCU (source : Leeham News, 2015) ; le prototype n'a ni OIS ni KCCU | Fidélité de mise en page, côté copilote |
| Plafonnier | P | 100 commandes, environ 38 réellement simulées | Chaque commande reliée au modèle, ou marquée « visuel » dans l'interface |
| Vue extérieure 3D | P | Relief réel à environ 10 km, texture satellite, pistes. Pas de nuages, de nuit ni d'éclairage des phares | Météo visuelle, cycle jour/nuit, relief plus fin autour des aéroports |
| Roulage | O | Plan d'aéroport simplifié et fictif, roulage auto | Plans réels (données ouvertes), panneaux, limites de roulage |
| Radio et équipage | P | Scénario déclenché par événements ; secteurs et fréquences approximatifs | Phraséologie selon les sources OACI et DGAC, collationnement évalué |
| Journal de bord | O | Heures OUT/OFF/ON/IN, événements, carnet en localStorage | Stockage IndexedDB, export, lien avec l'évaluation |
| Calculs | O | 14 fiches de calcul correctes dans les hypothèses du modèle | Unités, cas d'école, vérification croisée avec le moteur |
| Pédagogie | P | Guide de 47 étapes, mode détaillé, leçons, aide « ? » | Exercices, quiz, évaluation, progression, cartographie des systèmes |
| Scénarios | P | 4 points de départ et 5 pannes | Scénarios décrits par données : météo, pannes programmées, objectifs |
| Sauvegarde | V | Aucune sauvegarde de session. Seul le carnet est conservé | Sauvegarde et reprise de l'état complet |
| Sons | P | Synthétisés dans la page, voix pré-enregistrées en anglais | Banque de sons sous licence ou libre, mixage par zone |

### Commandes du plafonnier, mesurées dans le code

- **Agissent sur un modèle (≈ 38)** : ADR et IR, batteries, prises de parc, générateurs, BUS TIE, pompes hydrauliques, pompes du centre, X FEED, PACKs, prélèvements d'air (bleeds), X BLEED, pressurisation (mode, MAN V/S, DITCHING), MAN START, APU, boutons FIRE et bouteilles, BEACON.
- **Mémo ECAM ou guide seulement (≈ 18)** : PRIM (sauf si les trois sont coupés), pompes d'aile, antigivrage ailes et moteurs, sondes, feux STROBE, LAND, NOSE, RWY TURN OFF, consignes passagers, ANN LT, RCDR.
- **Purement visuelles (≈ 44)** : SEC 1 à 3, oxygène, évacuation, appels, essuie-glaces, FADEC GND, AC ESS FEED, GALY & CAB, COMMERCIAL, RAM AIR, HOT AIR, températures, ventilation, éclairage intérieur, WING, NAV & LOGO, EMER EXIT, soute.

### Bugs et défauts constatés

1. **Injection HTML** : les notes du journal et le texte radio sont insérés dans la page sans échappement (`innerHTML`).
2. **Couplage par index** : les tableaux d'étapes du guide, des fiches et des observations sont alignés par position. Un ajout d'étape décale tout ; c'est la cause du blocage de l'étape 40 (sélecteur invalide).
3. **Code mort** : fonctions d'instantané et d'annulation de l'ancien double-tap, `helpTrack` vide.
4. **Simplifications présentées sans étiquette** : QFU de piste pris comme cap vrai (la déclinaison magnétique est ignorée), fréquences ILS et radio fictives, noms de points inventés.
5. **Durées de vol jamais mesurées de bout en bout** : la durée d'environ 11 h est un calcul ; le vol complet en temps réel n'a pas été rejoué en test.
6. **Panne moteur** : la poussée est sommée, donc aucun effet de dissymétrie. C'est faux aéronautiquement.
7. **Planification carburant** : un coefficient fixe de 12,6 kg/NM au lieu d'une intégration sur le profil.

### Analyse du réalisme A350 par domaine

Chaque ligne compare une donnée publique, consultée le 31/10/2026 et citée, à la valeur du prototype. **Conforme** : même valeur ou même principe. **Approximation** : le principe est là mais simplifié. **Écart** : la donnée du prototype est fausse ou absente. **À vérifier** : aucune source publique n'a été trouvée ; la donnée ne doit pas être présentée comme réelle.

| Domaine | Élément | Donnée publique (source) | Prototype | Statut |
|---|---|---|---|---|
| Cockpit | Écrans | 6 écrans identiques ; les 2 extérieurs portent l'OIS (sacoche de vol électronique) (Leeham) | PFD, ND, EWD, SD et ISIS, pas d'OIS | Écart |
| Cockpit | Interface FMS | 2 KCCU (clavier + curseur) agissent sur tous les écrans (Leeham) | Pages MFD au doigt ou à la souris | Approximation |
| Cockpit | Affichage moteur | Poussée affichée sur une échelle de 0 à 100 % (Leeham) | Jauges N1 en % | Écart, à confirmer sur documentation Airbus |
| Cockpit | Instruments de secours | Double instrument de secours intégré (FlightGlobal, 2006) | Un seul ISIS | Approximation |
| Cockpit | Freinage | Fonction « brake-to-vacate » (FlightGlobal, 2006) | Absente | Écart |
| Systèmes | Commandes de vol | Architecture 2H/2E : 2 circuits hydrauliques + 2 circuits électriques, actionneurs électro-hydrauliques (FlightGlobal, 2006) | Lois figées, pas d'actionneur de secours électrique | Approximation |
| Systèmes | Hydraulique | 5 000 psi : titre d'un article Eaton repéré, non relu | 5 000 psi, circuits G et Y | À vérifier |
| Systèmes | Électricité | Génération à fréquence variable, reprise de l'A380 (FlightGlobal, 2006) | Deux barres AC, sans fréquence | Approximation |
| Systèmes | Pneumatique | Prélèvement d'air conventionnel, électro-pneumatique (FlightGlobal, 2006) | Prélèvement simplifié (APU, moteurs, packs) | Conforme dans le principe |
| Propulsion | Poussée | Trent XWB-84 : 374,5 kN (84 200 lbf) au décollage 5 min, 317,6 kN en continu maximal (EASA TCDS E.111) | 374 kN | Conforme |
| Propulsion | Arbres | 3 corps, 100 % = N1 2 700, N2 8 200, N3 12 600 tr/min (EASA) | N1, N2, N3 en % | Conforme dans le principe |
| Propulsion | N1 maximal au décollage | 98,1 à 99,1 % selon la modification (EASA) | 98,0 % | Proche |
| Propulsion | Température | TGT 900 °C au décollage (5 min), 850 °C en continu, 700 °C au démarrage sol ; pas de limite d'EGT distincte dans le TCDS (EASA) | Libellé « EGT », rouge à 900 °C, pic de démarrage vers 700 °C | Valeurs proches, libellé à vérifier |
| Masses | Masse maximale au décollage | 283 t (Airbus, Facts & Figures 2022) | 283 t | Conforme |
| Masses | Carburant | 141 000 l (Airbus), soit environ 110,7 t à 0,785 kg/l | 110,5 t | Conforme (densité supposée) |
| Masses | Masse maximale à l'atterrissage | Absente des sources consultées | 207 t | À vérifier |
| Aérodynamique | Surface alaire, polaire, VFE | Absentes des sources consultées | 443 m², coefficients réglés à l'essai | À vérifier |
| Navigation | Pistes FMEE | 12/30 : 3 200 × 45 m, relèvement vrai 102° / 282° ; 14/32 : 2 670 × 45 m, 116° / 296° (SIA, eAIP FMEE) | 12/30 de 3 200 m orientées à 120° / 300° vrais ; pas de 14/32 | Écart de 18° |
| Navigation | Déclinaison FMEE | 19,2° Ouest (eAIP) | Ignorée | Écart |
| Navigation | ILS FMEE | Un seul ILS listé : LOC 14 sur 110,3 MHz (eAIP, à confirmer sur la carte d'approche) | ILS simulé en piste 12 | Écart |
| Navigation | Fréquences FMEE | Tour 118,4 ; Sol 121,9 ; Approche 119,4 et 127,2 ; ATIS 126,8 MHz (eAIP) | Fréquences fictives | Écart (choix à faire) |
| Navigation | Altitude FMEE | 66 ft (eAIP) | 66 ft | Conforme |
| Navigation | LFPO, LFPG | LFPG : 08L/26R 4 142 × 45 m, relèvement vrai 085° / 265°, déclinaison 1,9° E, élévation 392 ft, ILS 26R 111,95 MHz (MIAC DIRCAM). LFPO : 06/24 3 650 × 45 m, 061° / 241°, élévation 291 ft (SkyVector, vrai ou magnétique non précisé) | LFPG 26R : 4 215 m à 260° vrais ; LFPO 24 : 3 650 m à 240° ; élévations 392 et 291 ft | LFPG : écart de 5° et de 73 m ; LFPO : proche, à confirmer sur l'eAIP |

### Incohérences aéronautiques du prototype

1. **Pistes FMEE tournées de 18°.** Le prototype prend le numéro de piste (QFU magnétique) comme cap vrai. Cela fausse le terrain 3D, l'axe d'approche et l'ILS. À Paris, la déclinaison est faible (1,9° E) : l'écart n'est que de 5° à LFPG, mais la piste 26R y est trop longue de 73 m.
2. **ILS inventé en piste 12.** L'eAIP ne liste un ILS qu'en piste 14. L'approche réelle en 12 doit être lue sur la carte officielle avant d'être simulée, sans être inventée.
3. **Piste 14/32 absente** à FMEE.
4. **Fréquences radio fictives**, et secteurs de contrôle en route simplifiés (noms et limites approximatifs).
5. **Affichage moteur en N1** alors que l'A350 affiche la poussée en % (à confirmer).
6. **4 écrans au lieu de 6, pas d'OIS ni de KCCU** (voir la matrice).
7. **Pas d'architecture 2H/2E** : une panne hydraulique ne reconfigure pas les commandes de vol.
8. **Électricité sans fréquence variable** et sans consommateurs.
9. **Panne moteur sans lacet** (poussée dissymétrique non modélisée).
10. **Libellé « EGT »** alors que la limite certifiée porte sur la TGT. Valeurs proches, libellé à vérifier.
11. **Valeurs sans source** : alignement des IR en 150 s, régimes de ralenti, consommation forfaitaire de 12,6 kg/NM, croisière fixe au FL370 sur 11 h sans montée par paliers. Ces données sont à remplacer par des valeurs sourcées, ou à afficher comme « approximation pédagogique ».
12. **Contenus des mémos T.O et LDG, et libellés ECAM** : rédigés de mémoire, à confronter à une source publique ou à marquer comme simplifiés. Aucune procédure Airbus ne doit être présentée comme officielle.

### Structure HTML/CSS et limite de cet audit

L'interface tient dans un seul gabarit HTML et une seule feuille de style globale : onglets, barres et boîtes de dialogue. Le contenu dynamique est injecté par `innerHTML`, sans composants. Les styles ne sont pas isolés et la mise en page est dupliquée entre les vues. La migration React doit redécouper l'interface en composants avant d'y ajouter des fonctions.

Cet audit a été écrit par l'auteur du prototype : c'est un auto-audit. Les chiffres de la matrice viennent d'une relecture du code et de tests automatisés locaux, pas d'une revue indépendante. Avant la phase 1, il faut faire relire la matrice et ce tableau par une autre personne, idéalement quelqu'un qui connaît l'A350.

### Dépendances externes

- Google Fonts (B612, B612 Mono, Barlow) : hors ligne, la page retombe sur des polices système.
- Three.js r128 via cdnjs : hors ligne, pas de 3D (une vue 2D de secours existe).
- Relief et texture : image NASA Blue Marble recadrée, issue du dépôt webgl-earth (la provenance de la carte d'altitude reste à vérifier).
- Voix : générées hors ligne avec flite (via ffmpeg).

### Performances

- Un pas de physique à 60 Hz sur le fil principal ; à ×256, jusqu'à 900 pas par image.
- `groundElev` recalcule trois distances orthodromiques à chaque appel, plusieurs fois par pas.
- Rafraîchissement de l'interface par comparaison de chaînes HTML ; reconstruction du terrain (14 400 sommets) à chaque déplacement de 3 % du rayon visible.
- Mesurées en test : décollage, croisière et atterrissage stables ; aucun profilage sur un PC d'entrée de gamme.

### Accessibilité

Les écrans sont des canvas sans alternative textuelle. Les états reposent souvent sur la seule couleur. Le focus clavier n'est pas géré sur les commandes personnalisées, et `aria` est minimal. Points positifs : réduction des animations respectée, échelle de texte lisible dans les pages Radio, Journal et Calculs.

### Qualité du code

- Un état global `S` modifié partout (interface, moteur, guide, radio).
- Pas de types ni de frontière claire entre interface et simulation : par exemple, `fgUpdate` lit `S.efis` et `radAlt()` appelle le relief.
- Nombres magiques non documentés, textes en dur dans le code, pas de tests versionnés : les scripts de test Node et Playwright existent mais hors projet.
- **Modularisable** : `core`, `flight`, `taxi` et `comms` sont déjà presque indépendants du DOM. C'est la meilleure base pour le futur moteur.

## 2. Fonctionnalités à conserver

Le prototype reste la référence fonctionnelle : chaque point ci-dessous doit être reproduit, puis vérifié par un test, avant toute amélioration.

- **Vol complet de référence** FMEE ⇄ LFPO/LFPG : parking, roulage, décollage, montée, croisière, descente gérée, ILS, atterrissage automatique, roulage retour. Les résultats actuels (toucher autour de −250 ft/min, durée calculée d'environ 11 h) serviront de valeurs de référence pour les tests de non-régression.
- **Modèle de vol réglé** : coefficients aérodynamiques par configuration, effet de sol, lois d'auto-manette (SPEED, MACH, THR CLB, THR IDLE, alpha floor), profil de descente avec segments de décélération.
- **Démarrage cockpit froid** : batteries → groupe de parc → ADIRS (alignement) → APU → air → démarrage moteur à 3 arbres → générateurs.
- **Écrans** : PFD avec FMA, ND (ROSE, ARC, PLAN, TERR, plan d'aéroport), EWD avec mémos T.O et LDG, 11 pages SD, ISIS, et la police B612 (conçue pour les écrans Airbus).
- **Relief et image satellite embarqués**, avec collision réelle avec le sol et alarmes GPWS.
- **Pédagogie** : guide de 47 étapes, mode détaillé (à regarder, qui fait quoi, erreur fréquente), leçons par phase, aide « ? » sur chaque commande et chaque bloc.
- **Radio et équipage** avec collationnement ; **journal de bord** OOOI ; **14 fiches de calcul** ; **pannes** feu moteur, panne moteur, générateur, hydraulique.
- **Avertissement** de simulation pédagogique non certifiée.

## 3. Fonctionnalités à corriger

P0 = faux ou dangereux pour la pédagogie, à corriger dès le portage ; P1 = réalisme important ; P2 = finition.

| Priorité | Point | Correction |
|---|---|---|
| P0 | Commandes visuelles indiscernables des commandes simulées | Badge « simulé / partiel / visuel » dans l'aide « ? » et dans une vue Systèmes ; aucune commande sans fiche d'état |
| P0 | Panne moteur sans dissymétrie | Poussée par moteur, moment de lacet, compensation au palonnier et au trim |
| P0 | Approximations présentées comme des faits (fréquences, noms de points, secteurs, libellés ECAM) | Marquer explicitement « fictif » ou « simplifié » dans l'interface et dans la documentation |
| P0 | Injection HTML dans le journal et la radio | Rendu React (échappement automatique) |
| P0 | Couplage par index du guide | Étapes identifiées par clé (`step.id`), contenus dans des fichiers de données validés au démarrage |
| P1 | Pompes carburant sans effet | Alimentation moteur réelle : pression, aspiration, altitude |
| P1 | Lois de commandes figées | Lois normal, alternate et direct, selon PRIM, SEC, ADR et hydraulique |
| P1 | Électricité sans consommateurs | Graphe des barres et des équipements, effets visibles (écrans, pompes, éclairage) |
| P1 | Déclinaison magnétique ignorée | Modèle magnétique (WMM, domaine public) ; caps magnétiques sur les écrans |
| P1 | Planification carburant par coefficient | Prédictions FMS intégrées sur le profil, masse et niveau optimal |
| P1 | Durée de vol non mesurée | Test automatique du vol complet, accéléré, avec contrôle de la durée simulée |
| P2 | Pas de sauvegarde de session | Sauvegarde et reprise complètes |
| P2 | Accessibilité | Focus clavier, libellés ARIA, description textuelle de chaque écran, contraste vérifié |
| P2 | Interface pensée pour le téléphone (barre tactile, zoom) | Disposition PC : vues fixes, raccourcis clavier, souris, multi-écran possible |

## 4. Nouvelles fonctionnalités (résumé, détail dans SPECIFICATIONS.md)

Classées par apport pédagogique ; chacune est liée à un objectif, une tâche et un test dans le backlog.

1. **Vue Systèmes (cartographie A350)** : schéma interactif des dépendances. On clique une source et l'on voit ce qu'elle alimente. On injecte une panne et on suit sa propagation (par exemple GEN 1A → barre AC 1 → pompe hydraulique électrique → freins). C'est la pièce maîtresse pédagogique.
2. **Météo configurable** : vent en altitude et au sol, rafales, turbulence, visibilité, plafond, température et QNH. Ils agissent sur la physique (vitesse sol, vent de travers, performances) et sur l'image (nuages, brouillard).
3. **Moteur de scénarios par données** : vol normal, vent de travers, turbulence, visibilité réduite, panne moteur au décollage, panne électrique, panne hydraulique, déroutement, remise des gaz. Chacun avec ses conditions initiales, ses événements programmés, ses objectifs et ses critères d'évaluation.
4. **Évaluation** : écarts à l'axe et à la pente, vitesses, taux de toucher, check-lists, collationnements, respect des limites. Bilan du vol noté et commenté.
5. **Exercices et quiz** par système et par phase, et historique de progression stocké localement.
6. **Check-lists interactives** séparées du guide : normales et anormales, validées par l'état réel de l'avion.
7. **Vues du cockpit** : commandant, copilote, centrale, plafonnier, pédestal, et éclairage du cockpit (jour, nuit, intensités).
8. **Sauvegarde et reprise** de session à tout moment ; plusieurs profils d'élève sur le même PC.
9. **Périphériques** : manche, palonnier et manettes via la Gamepad API, avec une table de correspondance configurable. Plus tard, cockpit matériel via un module natif Tauri (HID, série).
10. **Données de navigation ouvertes** : aéroports et pistes réels (OurAirports, domaine public), déclinaison magnétique (WMM), procédures fictives clairement étiquetées, faute de données sous licence.

## 5. Sources et points à vérifier

Sources publiques à privilégier (liste de référence pour la suite ; celles consultées pour ce rapport sont listées juste après) :

- EASA, fiche de certificat de type de l'A350 (TCDS) : masses maximales, motorisations, limitations.
- Airbus, document « Aircraft Characteristics – Airport and Maintenance Planning » de l'A350 : dimensions et caractéristiques au sol.
- Rolls-Royce et EASA (TCDS moteur) pour le Trent XWB.
- OACI Doc 4444 et manuel de phraséologie de la DGAC pour les échanges radio.
- SKYbrary pour les concepts (lois de commandes, TCAS, GPWS).
- OurAirports (domaine public) pour les aéroports et les pistes ; NOAA WMM pour la déclinaison magnétique ; NASA Blue Marble et un modèle numérique de terrain public (ETOPO, GMTED, SRTM) pour le relief.

Sources consultées le 31/10/2026 pour le tableau de réalisme :

- [Airbus — A350 Family Facts & Figures (sept. 2022)](https://www.airbus.com/sites/g/files/jlcbta136/files/2022-09/airbus-a350-family-facts-and-figures_sept-2022.pdf) : masse maximale au décollage, carburant, dimensions, motorisation, rayon d'action.
- [EASA — TCDS E.111 Trent XWB, issue 12](https://www.easa.europa.eu/sites/default/files/dfu/EASA%20E111%20TCDS%20issue%2012_Trent%20XWB.pdf) : poussées, régimes des 3 arbres, limites de TGT.
- [SIA — eAIP FR-AD-2.FMEE (AIRAC 06/08/2026)](https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_06_AUG_2026/RUN/AIRAC-2026-08-06/html/eAIP/FR-AD-2.FMEE-fr-FR.html) : pistes, relèvements vrais, déclinaison, ILS, fréquences.
- [Leeham News — A350 cockpit compared to A320/A330 (2015)](https://leehamnews.com/2015/06/01/airbus-a350-cockpit-compared-to-a320a330/) : 6 écrans, OIS, KCCU, affichage de la poussée en %.
- [FlightGlobal — Borrowing from A380: A350 XWB (2006)](https://flightglobal.com/borrowing-from-a380-a350-xwb/71027.article) : 2H/2E, fréquence variable, prélèvement d'air, BTV, double instrument de secours. Article de conception : la définition finale de l'avion peut différer.
- [DIRCAM — MIAC 1 Paris-CDG (LFPG)](https://www.dircam.dsae.defense.gouv.fr/images/Stories/Doc/MIAC1/miac1_paris_cdg_lfpg.pdf) : pistes, relèvements vrais et magnétiques, déclinaison, fréquences ILS.
- [SkyVector — LFPO](https://skyvector.com/airport/LFPO/Paris-Orly-Airport) : pistes et élévation d'Orly (source secondaire, à remplacer par l'eAIP LFPO).

Non consultés (contenu inaccessible ou non relu) : la page Airbus « 5 reasons pilots love flying the A350 », la page Thales sur les technologies de l'A350, l'article Eaton sur les pompes à 5 000 psi.

Confirmées par les sources consultées : masse maximale au décollage (283 t), poussée du Trent XWB-84 (≈ 374 kN), limite de température de 900 °C. Restent à vérifier en priorité : masse maximale à l'atterrissage (207 t), surface alaire, régimes de ralenti, pression hydraulique, temps d'alignement des IR, disposition et libellés exacts du plafonnier, contenu des mémos T.O et LDG, vitesses VFE par configuration, positions des seuils et caps vrais de LFPO (eAIP LFPO). Pour LFPG, la longueur de la 26R (4 142 m, pas 4 215 m) et le cap vrai (265°, pas 260°) sont à corriger dans les données.

