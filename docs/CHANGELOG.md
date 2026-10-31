# CHANGELOG

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions selon [SemVer](https://semver.org/lang/fr/).
Catégories : Ajouté · Modifié · Corrigé · Supprimé · Données (valeurs sourcées ou requalifiées) · Sécurité.

## [Non publié]

### Ajouté
- Phase 0 : les 10 documents de cadrage dans `docs/` (v0.1).

### Données
- FMEE : pistes 12/30 à 102° / 282° vrais (le prototype utilise 120° / 300°), piste 14/32 (2 670 m, 116° / 296°) absente du prototype, déclinaison 19,2° W, ILS listé seulement en piste 14 (LOC 110,3 MHz) — source eAIP FMEE AIRAC 06/08/2026. À corriger en phase 2.
- LFPG : piste 08L/26R de 4 142 m à 085° / 265° vrais (le prototype utilise 4 215 m à 260°), déclinaison 1,9° E — source MIAC DIRCAM. À corriger en phase 2.
- Trent XWB-84 : 374,5 kN au décollage (prototype 374 kN, conforme), TGT 900 °C décollage, 700 °C démarrage sol — source EASA TCDS E.111 i12.
- MTOW 283 t et carburant 141 000 l confirmés — source Airbus Facts & Figures 2022.

## [0.0.0] — prototype navigateur (référence fonctionnelle, gelé)

Fichier unique `cockpit-a350.html` (≈ 4 700 lignes, ≈ 900 Ko).

### Fonctionnalités
- Vol complet FMEE ⇄ LFPO / LFPG : roulage automatique ou manuel, décollage, montée, croisière FL370, descente gérée, ILS, atterrissage automatique, roulage au poste.
- Écrans PFD, ND (ROSE, ARC, PLAN, TERR, plan d'aéroport), EWD, 11 pages SD, ISIS ; FCU, EFIS, MFD (INIT, FUEL & LOAD, PERF, F-PLN, POSITION).
- Plafonnier de 100 commandes (≈ 38 simulées, ≈ 18 partielles, ≈ 44 visuelles).
- Systèmes simplifiés : électricité, APU, ADIRS, pneumatique, pressurisation, hydraulique, carburant, moteurs à 3 arbres, feu.
- Vue 3D Three.js : relief et image NASA Blue Marble, aéroports, courbure terrestre.
- Guide de 47 étapes avec mode détaillé et leçons ; aide « ? » (un appui sur « ? » puis sur un élément).
- Radio et équipage avec collationnement ; journal de bord OOOI et carnet ; 14 fiches de calcul ; sons synthétisés et voix.
- 4 points de départ (cockpit froid, prêt, croisière, approche) et 5 pannes.

### Problèmes connus (corrigés dans la refonte)
- Injection HTML possible dans le journal et la radio (`innerHTML`).
- Étapes du guide couplées par index.
- Pistes orientées sur le QFU magnétique ; ILS et fréquences fictifs non étiquetés.
- Panne moteur sans dissymétrie de poussée.
- Durée du vol complet calculée, jamais mesurée en test.
- Dépendances réseau : Google Fonts, Three.js via cdnjs.
