# A350_SYSTEMS_MAP — Cartographie des systèmes

> Version 0.1 — 31/10/2026.
> Ce document décrit (1) ce que le prototype v0 modélise réellement, lu dans le code, et (2) la structure cible. **Les dépendances réelles de l'A350 ne sont écrites ici que lorsqu'une source publique les donne** ; tout le reste est marqué `à sourcer` et ne doit pas être présenté comme réel. La documentation Airbus (FCOM) n'est pas publique.

## 1. Légende

| Statut de commande | Sens |
|---|---|
| **S** simulé | Agit sur un modèle, effet visible et testable |
| **P** partiel | Lu seulement par un mémo ECAM, le guide ou un cas particulier |
| **V** visuel | Change d'apparence, aucun effet |

Statut de donnée : `documenté` (source citée) · `estimé` · `fictif` · `à sourcer`.

## 2. Vue d'ensemble des dépendances (prototype v0)

```
          EXT A/B ─┐
 APU ─► APU GEN ───┼──► AC (2 barres, BUS TIE) ──► DC ──► ADIRS (alignement)
 ENG 1/2 ─► GEN 1A/1B/2A/2B ─┘                     │
 BAT 1/2, BAT EMER 1/2 ─────────────────────────────┘ (DC seul si pas d'AC)

 DC ─► APU MASTER ─► APU (N, EGT) ─► APU BLEED ──┐
 ENG 1/2 (N3 > 55 %) ─► ENG BLEED 1/2 ───────────┼─► conduits G/D ─(X BLEED)─► PACK 1/2 ─► pressurisation
                                                  └─► démarrage moteur (air)
 ENG 1/2 (N3 > 50 %) ─► ENG PUMP A/B ─┐
 AC ─► ELEC PUMP G/Y (ON, ou AUTO au sol moteur arrêté et BEACON OFF) ─┴─► circuits G / Y (5 000 psi)
 AC ─► pompes CTR L/R ─► transfert centre → ailes ; X FEED ─► équilibrage gauche/droite
 réservoir L ─► ENG 1, réservoir R ─► ENG 2 (sans X FEED) ; réservoir vide ─► arrêt moteur
```

Source : lecture du code `core.js` (`sysElec`, `sysApu`, `sysAdirs`, `sysPneu`, `sysHyd`, `sysFuel`, `sysEng`). Ce schéma est **le modèle du prototype**, pas celui de l'avion.

## 3. Fiches par système

Chaque fiche suit le gabarit exigé (EF-067) : rôle · fonctionnement · dépendances · interactions · conséquences d'une panne · sources. Les champs « cible » sont à compléter avec des sources publiques avant la phase 4.

### 3.1 Électricité

- **Rôle** : alimenter tous les équipements en courant alternatif (AC) et continu (DC).
- **Donnée publique** : génération à fréquence variable, philosophie reprise de l'A380 (`documenté`, FlightGlobal 2006).
- **Prototype** : sources = 4 générateurs moteur (GEN 1A, 1B, 2A, 2B, actifs si N3 > 55 %), APU GEN, prises de parc EXT A/B (au sol, avion immobile), batteries. Deux barres AC reliées par BUS TIE. DC présent si batterie ou AC. Tension batterie 28,2 V avec AC, 25,4 V sans (`estimé`).
- **Limites v0** : pas de barres essentielles ni d'équipements rattachés ; les grands écrans s'éteignent seulement si aucune AC.
- **Cible** : graphe sources → contacteurs → barres → équipements (`à sourcer` pour la topologie réelle). Effets : écrans, pompes, éclairage, calculateurs.
- **Pannes testées v0** : GEN 1A (scénario).

### 3.2 APU

- **Prototype** : APU MASTER (si DC) ouvre le volet d'entrée d'air en 8 s, START lance la montée en régime (≈ 2,6 %/s), disponible au-delà de 95 %. EGT de démarrage modélisée en pic (`estimé`). Refroidissement de 60 s avant arrêt si APU BLEED était utilisé (`estimé`). Consommation 140 kg/h (`estimé`).
- **Cible** : limites et temporisations `à sourcer`.

### 3.3 ADIRS

- **Prototype** : 3 IR alimentés en DC, alignement en 150 s (`estimé`, à sourcer), remis à zéro si l'avion bouge pendant l'alignement. ADR 1-3 : au moins un requis.
- **Cible** : effets de la perte des ADR sur les lois de commandes et les écrans (`à sourcer`).

### 3.4 Pneumatique et pressurisation

- **Donnée publique** : prélèvement d'air conventionnel électro-pneumatique, pas d'architecture « bleedless » (`documenté`, FlightGlobal 2006).
- **Prototype** : prélèvement moteur si N3 > 55 % et bouton BLEED ; APU BLEED côté gauche ; X BLEED (SHUT/AUTO/OPEN, AUTO ouvert si l'APU fournit l'air). PACKs fermés pendant un démarrage moteur. Altitude cabine visée = 15,5 % de l'altitude avion, plafonnée à 6 000 ft (`estimé`), vitesse verticale cabine limitée à 600 ft/min avec packs. Mode MAN avec MAN V/S. DITCHING ferme le circuit (cabine suit l'avion).
- **Cible** : vannes de sortie, limites de pression différentielle (`à sourcer`), RAM AIR, HOT AIR.

### 3.5 Hydraulique

- **Données publiques** : architecture de commandes de vol 2H/2E (2 circuits hydrauliques, 2 circuits électriques) avec actionneurs électro-hydrauliques (`documenté`, FlightGlobal 2006). Pression 5 000 psi : `à sourcer` (article Eaton repéré, non relu).
- **Prototype** : circuits vert (G, moteur 1) et jaune (Y, moteur 2) à 5 000 psi. Pompes moteur A/B actives si N3 > 50 %. Pompes électriques ON, ou AUTO au sol, moteur arrêté et BEACON éteint. Effets : vitesse des volets et du train, pilote automatique.
- **Cible** : dépendances par gouverne, freins, roulette de nez, accumulateurs, actionneurs de secours électriques (`à sourcer`).

### 3.6 Carburant

- **Données publiques** : capacité 141 000 l (`documenté`, Airbus F&F 2022).
- **Prototype** : réservoirs L, R, C (110,5 t au total, `estimé` à partir de 0,785 kg/l). Pompes du centre (si AC) transfèrent vers les ailes jusqu'à 3 t sous le plein. X FEED égalise L et R. Moteur 1 consomme L (et l'APU), moteur 2 consomme R. Réservoir vide sans X FEED → arrêt du moteur.
- **Limite v0** : les pompes d'aile (L/R PUMP 1-2) n'ont aucun effet sur l'alimentation (P).
- **Cible** : alimentation par pression et par aspiration selon l'altitude (`à sourcer`).

### 3.7 Moteurs Trent XWB-84

- **Données publiques** (`documenté`, EASA TCDS E.111 i12) : poussée décollage 374,5 kN (5 min), continu maximal 317,6 kN ; 3 arbres, 100 % = N1 2 700, N2 8 200, N3 12 600 tr/min ; N1 décollage 98,1 à 99,1 % ; TGT 900 °C décollage, 850 °C continu, 700 °C démarrage sol.
- **Prototype** : démarrage par air (conduit > seuil), N1/N2/N3, « EGT » (libellé à vérifier, le TCDS parle de TGT), débit carburant, inverseurs. Poussée disponible selon altitude et Mach (`estimé`). Crans de manette : −20 (inverse), 0 (ralenti), 25 CL, 35 FLX/MCT, 45 TOGA.
- **Limite v0** : poussée des deux moteurs sommée, pas de lacet en panne moteur (P0).

### 3.8 Commandes de vol

- **Prototype** : loi normale approchée (commande de facteur de charge, protection d'incidence). PRIM 1-3 : seul l'arrêt des trois produit un message ECAM. SEC 1-3 visuels.
- **Cible** : lois normal, alternate, direct selon PRIM, SEC, ADR, hydraulique (`à sourcer` : conditions de bascule publiées par SKYbrary ou équivalent).

### 3.9 Feu

- **Prototype** : feu moteur et APU, poignée ENG FIRE tirée → arrêt du moteur et coupure de son prélèvement d'air (ses générateurs tombent avec le régime) ; APU FIRE → arrêt de l'APU, 2 bouteilles par moteur, 1 pour l'APU, procédure ECAM.
- **Cible** : boucles de détection, TEST, conséquences systèmes (`à sourcer`).

### 3.10 Autres

Antigivrage, essuie-glaces, oxygène, évacuation, appels, éclairage intérieur et extérieur, soute, ventilation avionique : **visuels ou mémo** dans v0. Chacun sera soit modélisé (givrage lié à la météo, phase 5), soit marqué visuel dans l'interface.

## 4. Statut des 100 commandes du plafonnier (v0)

Lecture de `OVH_DEF` (`core.js`) croisée avec les fonctions systèmes. Classement à revalider commande par commande en phase 3.

| Panneau | Commandes | Statut v0 |
|---|---|---|
| ADIRS | ADR 1-3, IR 1-3 | S |
| F/CTL | PRIM 1-3 | P (effet seulement si les trois sont coupés) |
| F/CTL | SEC 1-3 | V |
| EVAC · RCDR · OXYGEN | EVAC CMD, HORN OFF, CREW OXY, PAX OXY | V |
| EVAC · RCDR · OXYGEN | RCDR GND | P |
| CALLS · WIPER L | CALL ALL, MECH, WIPER L, RAIN RPLNT | V |
| FIRE | ENG 1/2 FIRE, AGENT 1/2, APU FIRE, AGENT | S |
| FIRE | TEST | à revalider |
| ELEC | BAT 1/2, BAT EMER 1/2, EXT A/B, GEN 1A/1B/2A/2B, APU GEN, BUS TIE | S |
| ELEC | AC ESS FEED, GALY & CAB, COMMERCIAL | V |
| HYD | ENG 1/2 PUMP A/B, ELEC PUMP G/Y | S |
| FUEL | CTR L/R, X FEED | S |
| FUEL | L PUMP 1/2, R PUMP 1/2 | P |
| AIR | PACK 1/2, ENG 1/2 BLEED, APU BLEED, X BLEED | S |
| AIR | HOT AIR 1/2, CKPT °C, CABIN °C, RAM AIR | V |
| ANTI ICE | WING, ENG 1/2, PROBE/WINDOW | P |
| CABIN PRESS | MODE SEL, MAN V/S, DITCHING | S |
| CABIN PRESS | LDG ELEV | à revalider |
| ENG · APU | MAN START 1/2, APU MASTER, APU START | S |
| ENG · APU | FADEC GND 1/2 | V |
| EXT LT | BEACON | S (condition des pompes électriques) |
| EXT LT | STROBE, LAND, NOSE, RWY TURN OFF | P |
| EXT LT | WING, NAV & LOGO | V |
| SIGNS | SEAT BELTS, NO SMOKING | P |
| SIGNS | EMER EXIT LT | V |
| INT LT | ANN LT | P |
| INT LT | OVHD INTEG, DOME | V |
| CARGO · VENT · WIPER R | CARGO AIR, SMOKE TEST, AVNCS VENT, WIPER R | V |

Totaux de l'audit : ≈ 38 S, ≈ 18 P, ≈ 44 V. Ce tableau devient en phase 3 un fichier de données (`cockpit/controls.json`) avec, pour chaque commande : id, panneau, type, statut, systèmes affectés, test associé.

## 5. Matrice des tests de dépendances (cible ≥ 60)

| Système | Nombre visé | Exemple de cas |
|---|---|---|
| Électricité | 15 | GEN 1A et 1B OFF, BUS TIE ON → barre AC 1 alimentée par le côté 2 |
| Hydraulique | 10 | Moteur 1 arrêté, ELEC PUMP G AUTO, au sol, BEACON OFF → circuit G pressurisé |
| Carburant | 8 | Réservoir L vide, X FEED OFF → arrêt moteur 1 ; X FEED ON → moteur 1 continue |
| Air | 8 | APU BLEED ON, X BLEED AUTO → les deux conduits alimentés |
| Commandes de vol | 8 | (après sourçage des conditions de bascule de loi) |
| Moteurs | 6 | Panne moteur 2 au décollage → moment de lacet vers la droite |
| Feu | 5 | ENG 1 FIRE tiré → moteur 1 arrêté, ENG 1 BLEED sans air, GEN 1A/1B perdus quand N3 < 55 % |

Les exemples ci-dessus décrivent le comportement **du prototype** ; chaque cas cible devra citer sa source avant d'être déclaré `documenté`.
