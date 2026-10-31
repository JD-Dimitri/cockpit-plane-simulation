# UI_UX_SPECIFICATIONS — Interface et expérience

> Version 0.1 — 31/10/2026. Cible : PC Windows, souris + clavier, écran 1920 × 1080 minimum recommandé (fonctionnel en 1366 × 768). Le prototype v0 était pensé pour le téléphone (barre tactile, zoom) : cette disposition est abandonnée.

## 1. Principes

1. **Lisible avant d'être joli** : police B612 pour les écrans avion, contraste vérifié (AA minimum).
2. **Toujours savoir ce qui est réel** : badge de statut (simulé / partiel / visuel ; documenté / estimé / fictif) dans l'aide et la vue Systèmes.
3. **Rien au hasard** : toute action est accessible à la souris et au clavier ; aucune information portée par la seule couleur.
4. **Le cockpit d'abord, l'explication à la demande** : la pédagogie (bulle, aide, leçons) s'affiche par-dessus sans masquer l'élément expliqué.

## 2. Structure des vues

| Vue | Contenu | Raccourci |
|---|---|---|
| Pilote | Vue extérieure 3D en haut, PFD, ND, EWD, SD, ISIS ; FCU, EFIS, manettes, volets, train en bas | F1 |
| Plafonnier | 100 commandes, regroupées par panneaux (ADIRS, F/CTL, ELEC, HYD, FUEL, AIR, ANTI ICE, CABIN PRESS, ENG·APU, EXT LT, SIGNS, INT LT…) | F2 |
| Pédestal & FMS | MFD (INIT, FUEL & LOAD, PERF, F-PLN, POSITION), radios, moteurs (MASTER), parking, freinage auto | F3 |
| Systèmes | Schéma interactif des dépendances, injection de pannes | F4 |
| Radio & équipage | Fil des échanges, collationnement, fréquences | F5 |
| Journal | Carnet OOOI, événements, notes, export | F6 |
| Calculs | 14 fiches de calcul | F7 |
| Réglages | Graphismes, son, commandes, manettes, profil, accessibilité | F10 |

Barre supérieure permanente : scénario, heure UTC simulée, accélération du temps, pause, guide, « ? », sauvegarde.

Évolution prévue (phase 7) : vues commandant / copilote / centrale, éclairage cockpit jour/nuit, disposition à 6 écrans avec OIS.

## 3. Interactions

### 3.1 Commandes du cockpit

| Type | Souris | Clavier (focus) |
|---|---|---|
| Bouton poussoir | clic | Espace / Entrée |
| Sélecteur | clic gauche = cran suivant, clic droit = cran précédent, molette | ← / → |
| Bouton gardé | 1er clic ouvre la garde, 2e actionne | Entrée × 2 |
| Rotacteur | molette ou glisser | ↑ / ↓ (Maj = pas fin) |
| Interrupteur à positions | clic sur la position | ← / → |

Chaque commande affiche au survol : nom, état actuel, statut de simulation (infobulle courte).

### 3.2 Pilotage

| Action | Clavier par défaut | Manette (Gamepad API) |
|---|---|---|
| Manche tangage / roulis | flèches ↑ ↓ ← → | axes 1-2 |
| Palonnier / roulette | Z / X (tiller : Q / D) | axe palonnier |
| Manettes de gaz | Page Haut / Page Bas, crans au clic | axe gaz |
| Volets | F9 / F8 | bouton configurable |
| Train | G | bouton configurable |
| Freins | B (maintenu), parking Ctrl + B | gâchettes |
| Déconnexion pilote auto | Suppr | bouton configurable |

Tous les raccourcis sont modifiables (Réglages → Commandes) et la table de correspondance des manettes est sauvegardée par profil.

### 3.3 Aide « ? » (comportement validé)

1. Un clic sur « ? » (ou touche **H**) arme l'aide : curseur en point d'interrogation, bandeau « Clique sur un élément ».
2. Le clic suivant sur n'importe quel élément ouvre la fiche, **sans actionner l'élément** :
   - une commande → sa fiche (rôle, état, effet, statut, sources) ;
   - un bloc / panneau → explications groupées de tout le bloc ;
   - un écran → fiche de la zone cliquée (ex. bande de vitesse du PFD) avec lien « tout l'écran ».
3. Échap ou un clic hors de la fiche referme. L'aide se désarme après une fiche (option « rester armé »).

### 3.4 Guide pas à pas

- Bulle numérotée « n / N » pointant l'élément à actionner (surbrillance animée, désactivable).
- Boutons : Détails (à regarder, qui fait quoi, erreur fréquente), Leçon (de phase), Passer, Précédent.
- Le guide suit l'état réel : une étape déjà faite est sautée ; une étape devenue sans objet est marquée « non applicable ».
- Étapes identifiées par clé (`step.id`), jamais par position.

### 3.5 Vue Systèmes

- Schéma par système (électricité, hydraulique, carburant, air) ; flux animés quand une source alimente.
- Clic sur une source : surligne tout ce qu'elle alimente. Clic sur un consommateur : remonte ses sources.
- Panneau « Injecter une panne » (mode instructeur) : liste des pannes du scénario, effet visible en direct.

## 4. Écrans avion

- Rendu canvas, mise à l'échelle sans flou (prise en compte du `devicePixelRatio`).
- Chaque écran a une **description textuelle** accessible (zone `aria-live` polie, mise à jour à 1 Hz maximum) : vitesse, altitude, cap, modes FMA, alertes.
- Couleurs Airbus d'usage (vert, cyan, magenta, ambre, rouge, blanc) **doublées** d'un texte ou d'une forme pour les états.

## 5. Messages et alertes

| Type | Rendu | Son |
|---|---|---|
| Information | bandeau bas, 6 s | aucun |
| Avertissement pédagogique | bandeau ambre | carillon simple |
| Alerte ECAM | EWD + voyant MASTER CAUTION / WARNING | sons d'alerte |
| Accident | fenêtre modale avec cause, bilan, « Recommencer » / « Revoir » | — |

## 6. Accessibilité (exigence ENF-007)

- Navigation complète au clavier, ordre de tabulation par panneau, focus visible (contour 2 px contrasté).
- Libellés ARIA sur toutes les commandes (« BAT 1, bouton poussoir, position AUTO, simulé »).
- Contraste AA vérifié par axe-core en CI ; option « contraste élevé ».
- Respect de `prefers-reduced-motion` ; taille de texte réglable de 100 à 150 % pour les vues Radio, Journal, Calculs, aide.
- Sous-titres pour toutes les annonces vocales.

## 7. Premier lancement

1. Avertissement « outil pédagogique non certifié » à accepter.
2. Création du profil (prénom ou pseudo, stocké localement).
3. Choix : « Je découvre » (vol guidé depuis le cockpit froid) ou « Je connais » (choix libre du scénario).
4. Test rapide du son et des commandes (facultatif).

## 8. Textes

- Français, tutoiement dans le guide (comme le prototype), vocabulaire aéronautique expliqué au premier usage (glossaire accessible depuis chaque fiche).
- Textes externalisés dans `fr.json` ; aucun texte en dur.
