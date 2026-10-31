# PROJECT_OVERVIEW — Simulateur pédagogique de type A350

> Version du document : 0.1 (phase 0, cadrage) — 31/10/2026
> Statut : brouillon à relire. Ce logiciel est un **outil pédagogique non certifié**. Ce n'est ni un dispositif de formation agréé, ni un moyen de qualification, ni une source de procédures opérationnelles.

## 1. En une phrase

Un logiciel Windows autonome, hors ligne, qui fait comprendre comment fonctionne un avion de ligne de type Airbus A350-900 : ses systèmes, son cockpit, ses procédures publiques et la physique du vol, sur un vol complet Saint-Denis de La Réunion (FMEE) ⇄ Paris (LFPO / LFPG).

## 2. Pourquoi ce projet

- **Apprendre** : relier chaque commande du cockpit à son effet réel sur l'avion (électricité, hydraulique, carburant, air, moteurs, commandes de vol).
- **Comprendre la physique** : portance, traînée, poussée, masse, atmosphère, navigation orthodromique, rendues visibles et calculables.
- **Vivre un vol complet** : du cockpit froid au parking d'arrivée, environ 11 h en temps réel, avec accélération du temps.
- **Projet d'apprentissage du développeur** : architecture propre, typée et testée (préparation DWWM / full stack).

## 3. Public visé

| Public | Besoin principal |
|---|---|
| Curieux d'aviation, passionnés | Comprendre « ce que fait ce bouton » et pourquoi |
| Élèves pilotes (en complément, pas en substitution) | Visualiser les dépendances entre systèmes |
| Enseignants (physique, technologie) | Illustrer des notions de physique sur un cas réel |

Non visé : la formation réglementaire, l'entraînement à une qualification de type, l'usage opérationnel.

## 4. Périmètre

### Inclus

- Un seul avion : A350-900 à moteurs Trent XWB-84.
- Trois aéroports : FMEE, LFPO, LFPG ; quatre routes (aller et retour vers chacun des deux aéroports parisiens).
- Cockpit : écrans principaux, FCU, EFIS, plafonnier, pédestal, MFD.
- Systèmes modélisés pas à pas (voir `A350_SYSTEMS_MAP.md`).
- Vue extérieure 3D : relief et image satellite.
- Pédagogie : guide pas à pas, aide « ? », leçons, vue Systèmes, scénarios, évaluation.
- Radio et équipage, journal de bord, fiches de calcul.

### Exclu (pour cette version)

- Application mobile, version web publique, serveur, comptes utilisateurs.
- Symfony / PHP ou tout backend distant.
- Données de navigation sous licence (procédures SID/STAR réelles, voies aériennes) : elles seront fictives et étiquetées comme telles.
- Multijoueur, trafic réel, ATC en ligne.
- Tout contenu présenté comme une procédure Airbus officielle.

## 5. Principes directeurs

1. **Ne rien inventer.** Toute valeur ou procédure présentée comme réelle cite une source publique. Sinon elle est marquée « estimée » ou « fictive » (voir `SPECIFICATIONS.md`, § Étiquetage).
2. **Pas de bouton décoratif caché.** Chaque commande est classée *simulée*, *partielle* ou *visuelle*, et ce statut est visible dans l'interface.
3. **Le moteur ne connaît pas l'interface.** Il reçoit des commandes et publie un état ; l'interface ne modifie jamais l'état directement.
4. **Chaque fonctionnalité a son test.** Une fonctionnalité sans test n'est pas terminée.
5. **Hors ligne d'abord.** Aucune ressource réseau à l'exécution (polices, 3D, sons, relief embarqués).
6. **Pas de réécriture massive.** Le prototype est porté module par module, avec un vol de référence rejoué en test à chaque étape.

## 6. Point de départ

Le prototype navigateur (`cockpit-a350.html`, v0) est la **référence fonctionnelle**. Il fait un vol complet en automatique, mais seules ≈ 38 des 100 commandes du plafonnier agissent sur un modèle. Le diagnostic complet est dans `FUNCTIONAL_AUDIT.md`.

## 7. Cible technique (résumé)

Tauri 2 (WebView2) + React + TypeScript + Vite + Three.js + Zustand + IndexedDB (Dexie). Moteur de simulation en TypeScript pur, dans un Web Worker. Détails dans `TECHNICAL_ARCHITECTURE.md`.

## 8. Carte des documents

| Document | Contenu |
|---|---|
| `PROJECT_OVERVIEW.md` | Ce document : vision, périmètre, principes |
| `FUNCTIONAL_AUDIT.md` | Diagnostic du prototype v0, réalisme, incohérences |
| `SPECIFICATIONS.md` | Exigences fonctionnelles et non fonctionnelles numérotées |
| `TECHNICAL_ARCHITECTURE.md` | Architecture logicielle, modules, flux de données |
| `A350_SYSTEMS_MAP.md` | Cartographie des systèmes, dépendances, statut de chaque commande |
| `UI_UX_SPECIFICATIONS.md` | Vues, interactions, accessibilité, aide « ? » |
| `SIMULATION_ENGINE.md` | Modèles physiques, hypothèses, simplifications, constantes |
| `TEST_STRATEGY.md` | Niveaux de tests, vols de référence, critères de recette |
| `ROADMAP.md` | Phases, livrables vérifiables, efforts |
| `CHANGELOG.md` | Historique des versions |

## 9. Mentions

- « Airbus », « A350 », « Rolls-Royce » et « Trent » sont des marques de leurs propriétaires. Ce projet n'est ni affilié, ni approuvé, ni soutenu par eux. Le logiciel s'appelle « simulateur pédagogique de type A350 » et n'utilise aucun logo.
- Police B612 (conçue pour Airbus avec l'ENAC et Intactile) : licence libre, EPL 2.0 et SIL OFL 1.1 à confirmer dans le dépôt officiel avant distribution.
- Relief et image : NASA Blue Marble (domaine public). Provenance exacte de la carte d'altitude à vérifier (voir `FUNCTIONAL_AUDIT.md`).
