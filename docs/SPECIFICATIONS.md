# SPECIFICATIONS — Exigences du logiciel

> Version 0.1 — 31/10/2026. Chaque exigence a un identifiant stable (`EF-xxx` fonctionnelle, `ENF-xxx` non fonctionnelle), une priorité et un critère de vérification. Une exigence n'est « faite » que si son test passe (voir `TEST_STRATEGY.md`).
>
> Priorités : **M** = indispensable pour la v1 · **S** = souhaitable v1 · **C** = plus tard.
> Phase : numéro de phase de `ROADMAP.md` où l'exigence est livrée.

## 1. Règles transverses

### 1.1 Étiquetage de la fidélité (exigence centrale)

Chaque donnée, commande, procédure ou message affiché porte l'un de ces statuts :

| Statut | Signification | Exemple |
|---|---|---|
| `documenté` | Valeur ou fait issu d'une source publique citée dans `nav-data/` ou `aircraft-a350/sources.json` | Poussée décollage 374,5 kN (EASA TCDS E.111) |
| `estimé` | Valeur calculée ou réglée pour un comportement plausible, sans source directe | Polaire de traînée par configuration |
| `fictif` | Inventé pour les besoins du jeu, à ne jamais confondre avec la réalité | Points de route GC01…, procédures SID/STAR |

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-001 | Toute valeur numérique de l'avion est déclarée dans un fichier de données avec `status` et, si `documenté`, une référence de source | M | Test de schéma : refus au démarrage d'une valeur sans statut | 2 |
| EF-002 | Toute commande du cockpit a un statut de simulation `simulé` / `partiel` / `visuel`, visible dans l'aide « ? » | M | Test : 100 % des commandes ont une fiche ; capture de l'aide | 3 |
| EF-003 | Aucun texte ne présente une procédure comme « procédure Airbus » ; les check-lists sont marquées « simplifiées, pédagogiques » | M | Revue de contenu + recherche automatique de mots interdits | 6 |
| EF-004 | Avertissement « outil pédagogique non certifié » au premier lancement et dans « À propos » | M | Test E2E premier lancement | 1 |

## 2. Exigences fonctionnelles

### 2.1 Vol et routes

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-010 | Quatre routes : FMEE→LFPO, FMEE→LFPG, LFPO→FMEE, LFPG→FMEE | M | Test : chaque route se charge et produit un plan de vol | 2 |
| EF-011 | Points de départ : cockpit froid, prêt au roulage, croisière, approche | M | Test par point de départ | 2 |
| EF-012 | Vol complet en temps réel d'une durée cohérente (≈ 11 h, à mesurer et documenter avec le vent nul) | M | Test accéléré : durée simulée dans une plage écrite | 2 |
| EF-013 | Accélération du temps ×1 à ×256 sans divergence de la physique | M | Test : même vol à ×1 (échantillon) et ×64, écarts sous tolérance | 2 |
| EF-014 | Pause, reprise, sauvegarde et reprise d'une session à tout moment | M | Test : sauvegarde en croisière, reprise, état identique | 6 |

### 2.2 Cockpit

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-020 | Écrans PFD, ND (ROSE, ARC, PLAN, TERR), EWD, SD (11 pages), ISIS, côté commandant | M | Tests visuels de référence (captures) | 3 |
| EF-021 | Côté copilote et disposition à 6 écrans avec OIS (contenu OIS pédagogique : carnet, calculs, fiches) | S | Capture + test de bascule d'écran | 7 |
| EF-022 | FCU, EFIS, plafonnier (100 commandes), pédestal, MFD (INIT, FUEL & LOAD, PERF, F-PLN, POSITION) | M | Test : chaque commande envoie la bonne commande au moteur | 3 |
| EF-023 | Interaction souris, clavier, et manche/palonnier/manettes via Gamepad API avec table de correspondance | M (souris, clavier) / S (manettes) | Tests E2E | 3 / 7 |
| EF-024 | Affichage moteur conforme à la convention A350 (poussée en %), N1 visible en page ENG | S | Capture, après vérification de la source | 3 |

### 2.3 Systèmes

Détail des dépendances dans `A350_SYSTEMS_MAP.md`.

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-030 | Électricité : sources → contacteurs → barres → équipements ; la perte d'une barre coupe ses équipements | M | ≥ 15 tests de dépendances | 4 |
| EF-031 | Hydraulique : deux circuits, dépendances par gouverne, freins, roulette de nez, train, volets | M | ≥ 10 tests | 4 |
| EF-032 | Carburant : alimentation moteur par pompes et aspiration, transfert, intercommunication, extinction par manque de carburant | M | ≥ 8 tests | 4 |
| EF-033 | Air : prélèvements, packs, pressurisation, limites de pression différentielle | M | ≥ 8 tests | 4 |
| EF-034 | Commandes de vol : lois normal, alternate, direct selon PRIM, SEC, ADR, hydraulique (architecture 2H/2E documentée) | M | ≥ 8 tests | 4 |
| EF-035 | Moteurs : poussée par moteur, moment de lacet en panne moteur, démarrage avec limites de température | M | ≥ 6 tests | 4 |
| EF-036 | ECAM : catalogue d'alertes avec priorité, inhibitions par phase, page STATUS ; libellés marqués `estimé` tant qu'ils ne sont pas sourcés | M | Tests par alerte | 4 |
| EF-037 | Feu moteur/APU, détection, test FIRE, bouteilles | S | Tests | 4 |

### 2.4 Navigation et aéroports

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-040 | Pistes, seuils, relèvements vrais et élévations issus de sources ouvertes (eAIP, OurAirports) | M | Test de données contre le fichier source | 2 |
| EF-041 | Déclinaison magnétique (WMM) ; caps affichés magnétiques, géométrie en vrai | M | Test : piste 12 FMEE à 102° vrai / ≈ 121° magnétique | 2 |
| EF-042 | ILS uniquement là où une source publique le liste ; sinon approche à vue ou RNAV fictive étiquetée | M | Test de données | 4 |
| EF-043 | Plans de roulage simplifiés étiquetés `fictif`, roulage manuel et automatique | M | Test : roulage parking → seuil et retour | 2 |
| EF-044 | Fréquences radio : réelles (sources eAIP) avec mention, ou fictives étiquetées — décision à prendre en phase 0 | S | Revue | 5 |

### 2.5 Météo et scénarios

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-050 | Météo réglable : vent par couche, rafales, turbulence, visibilité, plafond, température, QNH | M | Tests physiques (vitesse sol, dérive) | 5 |
| EF-051 | Scénarios décrits en JSON validé : conditions initiales, événements programmés, objectifs, critères | M | Test de schéma | 5 |
| EF-052 | 10 scénarios : vol normal, vent de travers, turbulence, visibilité réduite, panne moteur au décollage, panne électrique, panne hydraulique, déroutement, remise des gaz, cockpit froid complet | M | Chaque scénario joué par un test automatique | 5 |
| EF-053 | Moteur de scénarios : événements météo programmés (cellule orageuse, rafale, saut de température) | M | Test : l'événement se déclenche au temps prévu | 5 |
| EF-054 | Turbulence par zone, avec variation du facteur de charge et de la vitesse | M | Test : statistiques de n et de V dans la zone | 5 |
| EF-055 | Calcul et affichage de la marge (vitesse de décrochage à 1,3 g, MMO), marqués « estimé » | M | Test : valeur conforme à la formule de SC-HA-01 § 3.1 | 5 |
| EF-056 | Radar météo simplifié sur le ND (échos fictifs étiquetés) | S | Capture de référence | 5 |
| EF-057 | Pause automatique et débriefing quand une limite est dépassée, sans scène d'accident | M | Test E2E | 5 |

### 2.6 Pédagogie

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-060 | Guide pas à pas numéroté (bulle), étapes identifiées par clé et non par index | M | Test : ajout d'étape sans régression | 6 |
| EF-061 | Mode détaillé : à regarder, qui fait quoi, erreur fréquente, leçon de phase | M | Test de contenu (chaque étape a ses champs) | 6 |
| EF-062 | Aide « ? » : un appui sur « ? » puis sur n'importe quel élément (commande, bloc, écran) ouvre une fiche ; bloc = explications groupées | M | Tests E2E sur un échantillon de chaque type | 3 |
| EF-063 | Vue Systèmes : schéma interactif des dépendances avec injection de panne et propagation | M | Test E2E : GEN 1A off → effets affichés | 6 |
| EF-064 | Check-lists interactives normales et anormales, validées par l'état de l'avion | M | Tests | 6 |
| EF-065 | Exercices et quiz par système et par phase ; progression stockée localement par profil | S | Tests | 6 |
| EF-066 | Évaluation de fin de vol : écarts d'axe et de pente, vitesses, taux de toucher, check-lists, collationnements | M | Test avec vol de référence → note attendue | 6 |
| EF-067 | Fiche par système : rôle, fonctionnement, dépendances, interactions, conséquences d'une panne, sources | M | Test : chaque système a sa fiche complète | 6 |

### 2.7 Radio, journal, calculs

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-070 | Échanges ATC ↔ pilote ↔ copilote ↔ équipage de cabine déclenchés par événements, collationnement proposé | M | Tests par événement | 5 |
| EF-071 | Phraséologie fondée sur l'OACI (Doc 4444) et le manuel DGAC ; écarts étiquetés | S | Revue | 5 |
| EF-072 | Journal de bord : OUT/OFF/ON/IN, événements, notes, carnet stocké en IndexedDB, export JSON et CSV | M | Tests | 6 |
| EF-073 | 14 fiches de calcul (orthodromie, ETA, carburant, masse, atmosphère, vitesses, V/S, portance, descente, virage, vent, altitude-pression, endurance, conversions) avec unités et vérification croisée avec le moteur | M | Tests unitaires par fiche | 6 |

### 2.8 Rendu et son

| Id | Exigence | Prio | Vérification | Phase |
|---|---|---|---|---|
| EF-080 | Vue extérieure 3D : relief, image satellite, pistes, aéroports | M | Capture de référence | 3 |
| EF-081 | Nuages, brouillard, cycle jour/nuit, éclairage des phares | S | Captures | 5 / 7 |
| EF-082 | Sons moteurs, APU, vent, roulage, alarmes, annonces ; tous en fichiers locaux sous licence libre ou produits par le projet | M | Test : aucune requête réseau | 7 |

## 3. Exigences non fonctionnelles

| Id | Exigence | Prio | Vérification |
|---|---|---|---|
| ENF-001 | Windows 10 et 11 (64 bits), installeur NSIS ou MSI, WebView2 inclus en mode hors ligne | M | Installation sur machines vierges sans réseau |
| ENF-002 | Aucun accès réseau à l'exécution | M | Test : pare-feu bloquant, application pleinement fonctionnelle |
| ENF-003 | Lancement en moins de 10 s sur le PC de référence | M | Mesure automatisée |
| ENF-004 | 60 images/s sur le PC de référence (à définir : CPU, GPU intégré, 8 Go) ; qualité réglable | M | Mesure sur 10 min de vol |
| ENF-005 | Moteur déterministe : mêmes entrées et même graine → même état | M | Test de rejeu |
| ENF-006 | Zéro erreur console sur une session de 2 h accélérée | M | Test E2E long |
| ENF-007 | Accessibilité : tout au clavier, focus visible, libellés ARIA, description textuelle de chaque écran, contraste AA, réduction des animations | M | Audit axe-core + tests clavier |
| ENF-008 | Interface en français ; textes externalisés (préparation i18n) | M / C (autres langues) | Test : aucun texte en dur dans les composants |
| ENF-009 | Données utilisateur locales uniquement (IndexedDB, dossier de l'application) ; export/import possibles | M | Tests |
| ENF-010 | Sécurité : pas d'`innerHTML` avec données utilisateur, CSP stricte, permissions Tauri minimales | M | Lint + revue de configuration |
| ENF-011 | Taille d'installation ≤ 500 Mo (budget à confirmer) | S | Mesure de l'installeur |
| ENF-012 | Code TypeScript strict, couverture de tests du moteur ≥ 80 % | M | CI |

## 4. Décisions à prendre (ouvertes)

| # | Question | Options | À décider en |
|---|---|---|---|
| D-1 | Fréquences radio réelles ou fictives ? | Réelles (eAIP, mention) / fictives étiquetées | Phase 0 |
| D-2 | Approche en piste 12 à FMEE sans ILS publié | RNAV fictive étiquetée / à vue / utiliser la 14 avec ILS | Phase 0 |
| D-3 | PC de référence | À définir avec le matériel disponible | Phase 1 |
| D-4 | Source de la carte d'altitude | ETOPO / GMTED / SRTM (licence à vérifier) | Phase 1 |
| D-5 | Contenu OIS | Carnet, calculs, fiches pédagogiques (pas de données Airbus) | Phase 7 |

### Décisions prises

| # | Décision | Date |
|---|---|---|
| D-6 | SC-HA-01 : la réaction de l'élève à la survitesse n'est pas notée tant qu'aucune source publique ne décrit son traitement sur A350 | 09/11/2026 |
| D-7 | Radar météo simplifié sur le ND : ajouté (EF-056) | 09/11/2026 |
| D-8 | Fiche FAA « nose low » (AC 120-111) affichée dans l'aide « ? », avec la mention « principe générique, la procédure du constructeur prime » | 09/11/2026 |
