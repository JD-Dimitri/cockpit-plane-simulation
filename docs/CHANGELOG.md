# CHANGELOG

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions selon [SemVer](https://semver.org/lang/fr/).
Catégories : Ajouté · Modifié · Corrigé · Supprimé · Données (valeurs sourcées ou requalifiées) · Sécurité.

## [Non publié]

### Ajouté
- Phase 0 : les 10 documents de cadrage dans `docs/` (v0.1) ; prototype gelé dans `legacy/prototype-v0` (étiquette `v0.0.0`), scripts de test rendus indépendants du chemin.
- Phase 1 : monorepo pnpm ; `@a350/sim-core` (boucle à pas fixe 60 Hz, pause, accélération ×1 à ×256, plafond de pas par image, journal de commandes, rejeu déterministe, sauvegarde/reprise, ISA, géodésie, conversions vrai/magnétique) ; `@a350/aircraft-a350` (données sourcées, validation Zod) ; application React 19 + Vite avec moteur en Web Worker, avertissement au premier lancement, sonde ISA, globe Three.js, tableau des statuts ; coquille Tauri 2 (NSIS, WebView2 hors ligne, CSP) ; CI GitHub Actions ; test de fumée Playwright.

- Spécification du scénario générique SC-HA-01 (croisière haute altitude, convection, givrage, turbulence, survitesse) : `docs/scenarios/SC-HA-01-croisiere-convection.md`. Non jouable avant les phases 2, 4 et 5 ; ne reconstitue aucun accident.
- Exigences EF-053 à EF-057 (scénarios météo, turbulence, marge, radar météo, pause sur limite) et décisions D-6 à D-8 consignées dans `SPECIFICATIONS.md`.

### Modifié
- Poussée au décollage portée à 374 500 N (EASA TCDS E.111), au lieu de 374 000 N dans v0.

### Sécurité
- CSP `default-src 'self'` (navigateur et Tauri), aucune requête externe vérifiée par test ; ESLint interdit `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `dangerouslySetInnerHTML`.

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
