# Prototype v0 (gelé)

Référence fonctionnelle du projet. **Ne pas modifier** : toute évolution se fait dans `packages/` et `apps/`.

- `src/` : sources du prototype navigateur (modules concaténés).
- `build.py` : produit `cockpit-a350.html` (artefact publié, Three.js via CDN) et `preview.html` (Three.js local, pour les tests).
- `tests/` : scripts de test d'origine, rapatriés tels quels (seuls les chemins absolus ont été rendus relatifs).
  - `*.js` : vols sans interface, à lancer depuis ce dossier : `node tests/test_flight.js` (approche FMEE, toucher attendu ≈ −255 ft/min).
  - `*.py` : tests Playwright (Python) sur `preview.html` ; lancer `python3 build.py` d'abord.

Ces valeurs servent de référence aux vols VR-01 à VR-06 (`docs/TEST_STRATEGY.md`).
