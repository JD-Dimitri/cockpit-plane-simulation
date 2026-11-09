# Rapport de validation — Phase 1 (squelette de l'application Windows)

> Date : 09/11/2026 · Exécution de référence : [GitHub Actions n° 42660272495](https://github.com/JD-Dimitri/cockpit-plane-simulation/actions/runs/42660272495) · Commit `62c525d` · Résultat : **succès (2 jobs sur 2)**.
> Validation automatisée sur des machines Windows GitHub. Le test manuel sur le PC de l'auteur est en attente (§ 7).

## 1. Dépôt

| Élément | Valeur |
|---|---|
| Dépôt | https://github.com/JD-Dimitri/cockpit-plane-simulation |
| Branche | `main` |
| Historique | conservé depuis la phase 0 (`71c4957`), messages nettoyés le 09/11/2026 à la demande de l'auteur |
| Prototype historique | `legacy/prototype-v0` identique au commit de la phase 0 (vérifié par la CI à chaque exécution) |
| Étiquette `v0.0.0` | présente en local sur `71c4957` ; **absente de GitHub** (voir § 8) |
| Workflow | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |

## 2. Environnement de compilation (job « Compilation, tests et installeur »)

| Outil | Version |
|---|---|
| Windows (runner `windows-latest`) | 10.0.26100 |
| Node.js / pnpm | 22.23.4 / 10.28.0 |
| Rust / Cargo | 1.99.1 / 1.99.1 |
| React / React DOM | 19.3.1 |
| Vite / Vitest | 7.3.8 / 3.2.7 |
| Zustand / Three.js / Zod | 5.1.0 / 0.180.0 / 3.25.76 |
| TypeScript | 6.0.3 |
| Tauri CLI / API | 2.12.4 / 2.12.4 |

Toutes les dépendances sont les **vraies bibliothèques**, installées depuis les registres officiels. Aucune cale (`tools/offline-check`) n'est utilisée par la CI.

## 3. Contrôles statiques

| Contrôle | Résultat |
|---|---|
| TypeScript strict, tous les paquets, composants React compris | réussi |
| ESLint (architecture : moteur sans React/Three/Tauri ; sécurité : pas d'`innerHTML`) | réussi |

## 4. Tests unitaires et d'intégration (Vitest) — 44 / 44

| Paquet | Fichiers | Tests | Couvre |
|---|---|---|---|
| `@a350/sim-core` | 4 | 22 | moteur à 60 Hz, pause, accélération, plafond de pas, déterminisme et rejeu, sauvegarde et reprise, aléa, ISA, orthodromie, conversion vrai/magnétique, **parité exacte avec le prototype v0** |
| `@a350/aircraft-a350` | 1 | 10 | statut et source de chaque donnée, refus des données non sourcées, valeurs confirmées par l'audit |
| `@a350/desktop` | 2 | 12 | modèle de démonstration, textes, **composants React** (avertissement, barre du temps, tableau des statuts, repli 3D sans WebGL) |

## 5. Test du build dans un navigateur (Chromium) — 16 / 16

Avertissement affiché, interface masquée avant acceptation, focus clavier, moteur ×1, pause, ×64, commande ISA (−56,32 °C à 36 000 ft), statuts « documenté » et « estimé », rendu 3D, acceptation mémorisée, **aucune requête réseau externe**, aucune erreur console.

## 6. Installeur et application installée

### 6.1 Installeur

| Élément | Valeur |
|---|---|
| Fichier | `Simulateur pedagogique type A350_0.1.0_x64-setup.exe` |
| Taille | 209,7 Mo (WebView2 hors ligne embarqué) |
| SHA-256 | `5459EF9C7A5A8E39835A07879D973E2DA9365891DFA4A02EB4FA1A498AFFABF8` |
| Artefact | [`installeur-windows`](https://github.com/JD-Dimitri/cockpit-plane-simulation/actions/runs/42660272495/artifacts/13695565132) (connexion GitHub requise, expire le 07/02/2027) |
| Signature | aucune (avertissement SmartScreen possible) |

### 6.2 Installation hors ligne (machine Windows neuve, job « Installation et lancement hors ligne »)

| Étape | Résultat |
|---|---|
| WebView2 avant le test | 156.0.4314.58 |
| Désinstallation de WebView2 | **réussie** (WebView2 retiré de la machine) |
| Coupure du réseau sortant (pare-feu, seul l'agent GitHub autorisé) | effective, vérifiée par une requête Internet en échec |
| Installation silencieuse, réseau coupé | code 0, 87,3 s |
| WebView2 après installation | **présent** : installé depuis la copie embarquée, sans réseau |
| Désinstallation silencieuse | exécutable supprimé |

### 6.3 Lancement de l'application installée, réseau coupé — 19 / 19

Le test pilote le vrai WebView2 de l'application installée. Le port de pilotage est ouvert par une stratégie de registre **sur la machine de test seulement** ; le logiciel livré n'ouvre aucun port.

| Contrôle | Résultat |
|---|---|
| Premier lancement : avertissement affiché | 2,1 s après le lancement de l'exe (cible < 10 s) |
| Mention « non certifié » | oui |
| Origine de l'application | `http://tauri.localhost/` |
| Moteur (Web Worker) à ×1 | 0 → 2 s simulées |
| Pause | le temps s'arrête |
| Accélération ×64 | +96 s simulées en 1,5 s |
| Commande vers le moteur (ISA 36 000 ft) | −56,32 °C |
| Globe Three.js (WebGL réel) | canvas présent, pas de message « 3D indisponible » |
| Route La Réunion → Paris | dessinée : 192 pixels magenta mesurés sur la capture |
| Grille du globe | 10 760 pixels |
| Tableau des statuts | 7 lignes ; MTOW « documenté » avec source Airbus ; MLW « estimé » |
| Requêtes réseau (1er et 2e lancement) | uniquement `tauri.localhost` |
| Erreurs console (1er et 2e lancement) | aucune |
| Second lancement | avertissement non redemandé |

Captures (premier lancement, globe, application, second lancement) et `resultats.json` : artefact `resultats-windows` de l'exécution.

## 7. Éléments non vérifiés

| Élément | Raison |
|---|---|
| Test manuel sur le PC de l'auteur | en cours, par l'auteur |
| Captures d'écran lues par le relecteur | l'artefact n'est pas téléchargeable depuis l'environnement de rédaction ; les captures existent dans `resultats-windows` |
| Windows 10 | la CI tourne sur Windows Server / noyau 10.0.26100 ; Windows 10 grand public non testé |
| PC sans GPU dédié, écran haute densité | non testé |
| Performances 60 images/s (ENF-004) | pas encore de charge réelle (phase 2+) |

## 8. Anomalies restantes

| # | Anomalie | Gravité | Action proposée |
|---|---|---|---|
| A-1 | Étiquette `v0.0.0` absente de GitHub (le proxy de l'environnement de développement refuse l'envoi d'étiquettes) | moyenne | la pousser depuis Termux ou un PC |
| A-2 | `pnpm-lock.yaml` non versionné : les versions peuvent changer d'une compilation à l'autre | moyenne | versionner le fichier produit par la CI (artefact `resultats-build`), puis passer en `--frozen-lockfile` et réactiver le cache |
| A-3 | Installeur non signé | faible (développement) | certificat de signature avant toute diffusion |
| A-4 | Actions GitHub en Node.js 20 (dépréciées, forcées en Node.js 24) | faible | passer aux versions majeures suivantes des actions |
| A-5 | Avertissements jsdom « getContext non implémenté » dans les tests React | sans effet | aucune (repli testé volontairement) |
| A-6 | `tools/offline-check` n'a plus d'utilité depuis la CI au vert | faible | suppression à décider |

## 9. Décisions qui te reviennent

1. **Fin de la phase 1** : les critères du livrable (installeur produit, installé et lancé sous Windows, hors ligne) sont remplis en CI. Valides-tu la phase 1, éventuellement après ton test sur PC ?
2. **Licence** du dépôt (actuellement « tous droits réservés »).
3. **Suppression** de `tools/offline-check` (A-6).
4. **Démarrage de la phase 2** (portage du moteur de vol) : non commencé, en attente de ton approbation.
5. Inchangés et toujours ouverts : **fréquences radio** (D-1) et **approche en piste 12 à FMEE** (D-2).
