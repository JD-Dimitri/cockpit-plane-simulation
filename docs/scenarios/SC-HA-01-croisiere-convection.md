# SC-HA-01 — Croisière en haute altitude près d'une zone orageuse : givrage, turbulence, survitesse

> Version 0.1 — 09/11/2026 — **spécification** (rien n'est encore jouable).
> Scénario **générique et fictif**. Il ne reconstitue aucun vol ni aucun accident réel, et aucune donnée d'un accident n'y est utilisée.
> Les contenus pédagogiques citent des sources publiques. Les principes de récupération cités sont **génériques** (FAA) et ne sont **pas des procédures Airbus** : la FAA rappelle elle-même que « la procédure du constructeur prime » ([AC 120-111](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111.pdf), § 4-2).

## 1. Fiche

| Élément | Valeur | Statut |
|---|---|---|
| Identifiant | SC-HA-01 (scénario « turbulence » de la liste EF-052) | — |
| Phase de livraison | 5 (météo et scénarios) | — |
| Prérequis | Modèle de vol porté (phase 2), systèmes et alertes (phase 4), météo et turbulence (phase 5) | — |
| Avion | Type A350-900 du projet, données de `aircraft-a350` (valeurs documentées ou estimées, inchangées) | — |
| Route | Segment de croisière FMEE → LFPG, au-dessus de l'Afrique de l'Est | fictif |
| Situation de départ | Croisière stabilisée FL350, Mach 0,85, pilote automatique et auto-manette engagés, de nuit | fictif |
| Durée | 15 à 25 min en temps réel (accélération désactivée pendant les événements) | — |
| Public | Après le vol guidé complet (le guide de base est supposé connu) | — |

Pourquoi ce lieu : la route La Réunion–Paris traverse la zone de convergence intertropicale, où des orages à sommets très élevés sont fréquents. Le scénario reste ainsi dans le périmètre du projet. Position, heure et météo sont **inventées**.

## 2. Objectifs pédagogiques

À la fin du scénario, l'élève sait :

1. Expliquer pourquoi la plage de vitesses utilisables **se resserre avec l'altitude** (marge entre décrochage et Mach critique).
2. Distinguer vitesse indiquée, vitesse vraie et nombre de Mach, et lire leur évolution sur le PFD.
3. Expliquer comment une **rafale** ou un **changement de température** fait varier le Mach sans aucune action des pilotes.
4. Comprendre pourquoi **monter en turbulence près de l'altitude maximale** réduit encore la marge.
5. Reconnaître les premiers signes d'une situation qui se dégrade (variations de vitesse, écarts d'altitude, alerte de survitesse) et annoncer ce qu'il observe.
6. Citer les principes génériques de récupération d'une assiette anormale (FAA), et savoir qu'ils **ne remplacent pas** la procédure du constructeur.

## 3. Notions physiques expliquées

Les chiffres ci-dessous sont **calculés par le moteur du projet** (`isa()` de `@a350/sim-core`, atmosphère standard, vent nul). Ils servent d'exemple et ne sont pas des données de l'avion réel.

### 3.1 Même Mach, vitesse indiquée plus faible en montant

| Niveau | Température ISA | Vitesse du son | À Mach 0,85 : vitesse vraie | À Mach 0,85 : vitesse conventionnelle (CAS) | ρ / ρ₀ |
|---|---|---|---|---|---|
| FL310 | −46,4 °C | 587 kt | 499 kt | 318 kt | 0,361 |
| FL350 | −54,3 °C | 576 kt | 490 kt | 291 kt | 0,310 |
| FL370 | −56,5 °C | 574 kt | 488 kt | 278 kt | 0,284 |
| FL390 | −56,5 °C | 574 kt | 488 kt | 265 kt | 0,258 |
| FL410 | −56,5 °C | 574 kt | 488 kt | 253 kt | 0,235 |

À Mach constant, la vitesse conventionnelle baisse quand on monte. Or c'est elle, à masse donnée, qui fixe la portance disponible et donc la marge au décrochage. La limite haute, elle, est un Mach (MMO). La plage utilisable se resserre donc par les deux bouts : c'est le « coffin corner » ([SKYbrary — High-Altitude Flight Operations](https://skybrary.aero/index.php/High_Altitude_Flight_Operations) : « There is a continued reduction in the range of airspeed over which an aircraft remains controllable »).

Formule affichée dans la fiche (aérodynamique classique) : vitesse de décrochage proportionnelle à √(n · m g / (½ ρ₀ S C_L,max)), où n est le facteur de charge. Valeurs de S et C_L,max : `estimé` dans le projet, donc la vitesse de décrochage calculée sera marquée « estimée ».

### 3.2 La turbulence augmente le facteur de charge

Une rafale verticale fait passer brièvement le facteur de charge au-dessus de 1. À n = 1,3, la vitesse de décrochage est multipliée par √1,3 ≈ **1,14**. SKYbrary définit l'altitude limitée par le buffet comme celle où une charge de **1,3 g** (virage, manœuvre, turbulence) peut être encaissée sans buffet basse vitesse ni buffet de Mach.

### 3.3 Le Mach peut monter sans que personne ne touche à rien

Exemples calculés au FL350, Mach 0,85, ISA :
- **Rafale de face de +15 kt** sur la vitesse vraie : le Mach passe à **0,876** en quelques secondes.
- **Hausse de température de 5 °C** : la vitesse du son passe de 576 à 583 kt. À vitesse vraie constante le Mach baisse (0,840), mais la vitesse conventionnelle et l'auto-manette réagissent, et le phénomène inverse (refroidissement brutal) fait monter le Mach.

Ces variations, ajoutées à une limite haute proche (MMO du projet : 0,89, valeur `estimé`), expliquent qu'une survitesse momentanée puisse survenir en croisière par vent changeant. Airbus consacre un article à ce sujet, [Management of Overspeed Events in Cruise](https://flightsafety.airbus.com/2019/06/19/management-of-overspeed-events-in-cruise/) ; **son contenu détaillé n'a pas pu être consulté** et n'est donc pas utilisé.

### 3.4 Monter en turbulence

SKYbrary rappelle que :
- en mode vitesse verticale, la vitesse verticale choisie est prioritaire sur la vitesse, et une montée trop franche peut faire chuter la vitesse ;
- une auto-manette amortie pour le confort peut ne pas remettre la poussée assez vite ;
- au-delà d'environ 15° d'inclinaison, la traînée supplémentaire peut dépasser la poussée disponible.

L'élève comprend ainsi pourquoi demander une montée **dans** la zone turbulente n'est pas forcément un gain de marge.

### 3.5 Givrage en haute altitude

Au FL350 par −54 °C, l'eau liquide est rare : le givrage y est surtout lié aux **cristaux de glace** des nuages convectifs, qui touchent les sondes et les moteurs plus que la cellule. Le projet européen HAIC (High Altitude Ice Crystals) l'a étudié ([CORDIS — rapport final HAIC](https://cordis.europa.eu/project/id/314314/reporting/fr)) ; **son contenu reste à lire** avant d'écrire la fiche détaillée. Tant qu'il ne l'est pas, le scénario ne simule **aucun** effet du givrage sur les sondes ou les moteurs : il ne fait qu'en parler.

## 4. Déroulé

Temps indicatifs depuis le début du scénario. Chaque événement est déclenché par le moteur de scénarios (EF-051) et journalisé.

| t | Événement (simulé) | Ce que voit l'élève | Ce qu'explique le guide | Décision ou action attendue |
|---|---|---|---|---|
| 0 | Croisière FL350, M 0,85 | PFD, ND, vitesse stable | Rappel : Mach, vitesse vraie, vitesse conventionnelle (§ 3.1) | Identifier les trois vitesses sur le PFD |
| 2 min | Cellule orageuse fictive à 60 NM devant, sommets annoncés au-dessus du FL450 | Écho sur le ND (fonction radar météo à créer) | Pourquoi on contourne un orage plutôt que de passer au-dessus | **D1** : contourner, continuer ou monter |
| 5 min | Entrée en bordure de zone : turbulence modérée, précipitations, mention de cristaux de glace | Vitesse qui varie de ±10 kt, écarts d'altitude de quelques centaines de pieds | Facteur de charge et marge au décrochage (§ 3.2) ; givrage haute altitude (§ 3.5) | Annoncer ce qu'il observe (vitesse, altitude, Mach) |
| 7 min | Demande de montée au FL370 possible | Le contrôle (fictif) accepte si l'élève la demande | Effet d'une montée sur la marge (§ 3.1, § 3.4) | **D2** : demander ou non la montée |
| 9 min | Rafale de face et chute de température brutale (fictives) | Mach qui monte vers 0,88, puis alerte de survitesse si MMO est dépassé | Pourquoi le Mach monte seul (§ 3.3) | Reconnaître la survitesse et l'annoncer |
| 10 min | Fin de l'événement : sortie de la zone | Retour au calme | Bilan à chaud | — |

### Décisions et retours

- **D1 — Contourner.** Retour : c'est le choix enseigné par la prudence (rester à l'écart de la cellule). La **distance de contournement** recommandée n'est pas fixée par ce document : elle sera reprise d'une source publique (OACI, FAA ou SKYbrary) avant la phase 5.
- **D1 — Continuer ou monter.** Le scénario continue avec une turbulence plus forte. Retour : explication de la marge réduite.
- **D2 — Monter.** Le moteur calcule, avec les valeurs **estimées** du projet, la vitesse de décrochage à 1,3 g au FL370 à la masse du moment, et l'affiche à côté de la vitesse conventionnelle : l'élève voit la marge se réduire.
- **Survitesse.** Le scénario montre l'alerte et explique le phénomène. **Il ne note pas la réaction de l'élève** tant qu'aucune source publique ne décrit le traitement d'une survitesse sur A350 (voir § 7). Pendant ce temps, il présente seulement le principe générique de la FAA (§ 5) comme connaissance générale.

## 5. Principes génériques de récupération (FAA, présentés comme tels)

Fiche « Assiette anormale à piquer » (nose low), reprise **à l'identique** de la [FAA AC 120-111](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111.pdf) (14/04/2015, table 2), avec la mention obligatoire « Principe générique FAA — la procédure du constructeur prime » :

1. Reconnaître et confirmer la situation, annoncer « Nose low ».
2. Pilote automatique : déconnecter.
3. Auto-manette : déconnecter.
4. Sortir du décrochage si nécessaire.
5. Remettre les ailes à plat par le chemin le plus court.
6. Ajuster poussée et traînée si nécessaire.
7. Revenir en vol horizontal.
8. Le pilote non aux commandes surveille vitesse et assiette et annonce toute divergence.

Définition FAA d'une assiette anormale, affichée dans le glossaire : assiette > 25° à cabrer, > 10° à piquer, inclinaison > 45°, ou vitesse inadaptée aux conditions.

Ces fiches sont **théoriques** : le scénario ne place pas volontairement l'élève dans une assiette anormale en version 1.

## 6. Ce que le scénario ne fait pas

- Il ne reconstitue **aucun accident** et ne cite aucun accident récent.
- Il ne simule **ni rupture structurelle, ni écrasement, ni victimes**. Si une limite est franchie (MMO dépassé au-delà d'un seuil, ou facteur de charge hors limites), la simulation se met en pause et affiche : « Limite dépassée. Dans la réalité, cela peut endommager l'avion. Voyons ce qui s'est passé. », puis propose le débriefing.
- Il ne présente **aucune procédure Airbus** et aucune vitesse de pénétration en turbulence : ces données ne sont pas publiques dans les sources consultées.
- Il ne modifie **aucune donnée** de l'avion : il n'utilise que les valeurs existantes de `aircraft-a350`, avec leurs statuts.

## 7. Points à sourcer et décisions

| # | Sujet | Statut | Qui décide |
|---|---|---|---|
| S-1 | Traitement d'une survitesse sur A350 | **non public** dans les sources consultées ; contenu de l'article Airbus non lu | — (source à trouver) |
| S-2 | Protection haute vitesse des commandes de vol A350 | **à sourcer** (seules des copies non officielles du manuel ont été trouvées, non utilisables) | — |
| S-3 | Distance recommandée pour contourner un orage | à reprendre d'une source OACI / FAA / SKYbrary | — |
| S-4 | Effets des cristaux de glace (sondes, moteurs) | rapport HAIC à lire | — |
| S-5 | Valeur de MMO de l'A350-900 | `estimé` dans le projet (0,89) | — |
| D-6 | Le scénario note-t-il l'élève sur la survitesse ? | proposé : non, tant que S-1 n'est pas sourcé | **toi** |
| D-7 | Ajouter une fonction radar météo au ND (nouvelle exigence) | proposé : oui, phase 5 | **toi** |
| D-8 | Fiche FAA « nose low » affichée dans l'aide | proposé : oui, avec la mention « générique » | **toi** |

## 8. Exigences techniques nouvelles (proposées, non ajoutées à SPECIFICATIONS.md)

| Id proposé | Exigence | Vérification |
|---|---|---|
| EF-053 | Moteur de scénarios : événements météo programmés (cellule, rafale, saut de température) | Test : l'événement se déclenche au temps prévu |
| EF-054 | Turbulence par zone, avec variation du facteur de charge et de la vitesse | Test : statistiques de n et de V dans la zone |
| EF-055 | Calcul et affichage de la marge (vitesse de décrochage à 1,3 g, MMO) avec statut « estimé » | Test : valeur conforme à la formule § 3.1 |
| EF-056 | Radar météo simplifié sur le ND (écho fictif) | Capture de référence |
| EF-057 | Pause automatique et débriefing quand une limite est dépassée, sans scène d'accident | Test E2E |

## 9. Évaluation (critères mesurables)

| Critère | Mesure | Noté en v1 |
|---|---|---|
| Lecture des vitesses (t = 0) | L'élève désigne Mach, vitesse vraie et vitesse conventionnelle | oui |
| D1 | Choix fait et justification lue | oui (choix enregistré, pas de note « bonne/mauvaise » avant S-3) |
| Annonces | L'élève a annoncé la turbulence et la survitesse dans les 10 s | oui |
| D2 | Choix enregistré, marge affichée consultée | oui |
| Réaction à la survitesse | — | **non** (D-6) |
| Quiz final | 5 questions sur § 3 (calculs refaits par l'élève avec les fiches de calcul) | oui |

## 10. Sources

- [FAA — AC 120-111, Upset Prevention and Recovery Training (14/04/2015)](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-111.pdf) — consultée : définition de l'assiette anormale, tables de récupération, primauté du constructeur.
- [SKYbrary — High-Altitude Flight Operations](https://skybrary.aero/index.php/High_Altitude_Flight_Operations) — consultée : marges, buffet à 1,3 g, turbulence et vitesse, V/S, inclinaison.
- [Airbus — Management of Overspeed Events in Cruise](https://flightsafety.airbus.com/2019/06/19/management-of-overspeed-events-in-cruise/) — introduction seule consultée.
- [SKYbrary — Airplane Upset Prevention & Recovery Training Aid (AUPRTA) Rev 3](https://skybrary.aero/bookshelf/airplane-upset-prevention-recovery-training-aid-auprta-rev-3) — repérée, non lue.
- [FAA — AC 61-107B, Operations at altitudes above 25 000 ft (via SKYbrary)](https://skybrary.aero/bookshelf/ac-no-61-107baircraft-operations-altitudes-above-25000-feet-mean-sea-level-or-mach-numbers) — repérée, non lue.
- [CORDIS — HAIC, High Altitude Ice Crystals, rapport final](https://cordis.europa.eu/project/id/314314/reporting/fr) — repérée, non lue.
