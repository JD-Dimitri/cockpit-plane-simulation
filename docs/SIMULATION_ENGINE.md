# SIMULATION_ENGINE — Modèles physiques et hypothèses

> Version 0.1 — 31/10/2026. Décrit le moteur **tel qu'il existe dans le prototype v0** (lu dans `core.js` et `flight.js`), puis les évolutions prévues. Chaque constante porte un statut : `documenté` (source), `estimé`, `fictif`. Rien ici n'est une donnée constructeur sauf mention d'une source.

## 1. Conventions

- Unités internes SI : m, m/s, kg, N, rad, s. Affichage : ft, kt, NM, °.
- Constantes : 1 kt = 0,514444 m/s ; 1 ft = 0,3048 m ; 1 NM = 1 852 m ; g₀ = 9,80665 m/s² ; rayon terrestre 6 371 000 m (sphère).
- Pas de temps : boucle à 60 Hz ; l'accélération ×N exécute N pas par image (jusqu'à 900 pas par image à ×256 dans v0).
- Cible : pas fixe (60 à 120 Hz), indépendant de l'affichage, dans un Web Worker ; moteur déterministe (graine aléatoire unique pour turbulence et pannes).

## 2. Atmosphère

Atmosphère type OACI (ISA) : température −6,5 K/km jusqu'à 11 km puis constante ; pression et masse volumique déduites (`isa(h)`). **Limites v0** : aucun écart ISA, aucun vent, aucune turbulence. **Cible** : écart ISA, QNH, vent par couches interpolé, rafales et turbulence (modèle de Dryden ou von Kármán, à choisir et documenter).

## 3. Géodésie et navigation

- Terre sphérique. Distance, cap initial, point à distance donnée et interpolation sur l'orthodromie (`gcDist`, `gcBrg`, `gcDest`, `gcInterp`). Repère local Est-Nord-Haut autour d'un point (`enu`).
- Plan de vol : points orthodromiques générés (DEPxx, GC01…, IAxx, IFxx, FFxx, RWxx) — **`fictif`**, aucune voie aérienne.
- **Écart connu** : le QFU de piste est pris comme cap vrai (déclinaison ignorée). Cible : WMM pour la déclinaison, pistes en relèvement vrai depuis l'eAIP (FMEE 12 = 102° vrai).

## 4. Modèle de vol (point matériel)

### 4.1 Hypothèses

Modèle à point matériel : vitesse V, pente γ, cap ψ, inclinaison φ, incidence α. L'assiette est déduite (θ = γ + α). Pas de moments, pas de dérapage, pas d'inertie en tangage : **ce n'est pas un modèle à 6 degrés de liberté**.

### 4.2 Aérodynamique

| Grandeur | Formule v0 | Statut |
|---|---|---|
| Portance | C_L = C_L0,conf + C_Lα·α (linéaire jusqu'à α_s, puis 0,72 × C_L,max : décrochage) | `estimé` |
| Effet de sol | × (1 + 0,12 (1 − h/35 m)) sous 35 m | `estimé` |
| Traînée | C_D = C_D0 + ΔC_D,conf + k·C_L² + 0,022·train + 0,03·aérofreins + 0,09·spoilers sol + traînée d'onde 10 (M − 0,82)³ si M > 0,82 | `estimé` |
| Forces | L = q S C_L, D = q S C_D, q = ½ ρ V² | physique |

Constantes (`AC` dans `core.js`) :

| Constante | Valeur | Statut |
|---|---|---|
| Surface alaire S | 443 m² | `estimé` (à sourcer) |
| C_L0 / C_Lα / C_D0 / k | 0,22 / 5,2 rad⁻¹ / 0,0165 / 0,040 | `estimé` (réglés à l'essai) |
| Masse à vide en opération | 142,4 t | `estimé` |
| MTOW | 283 t | `documenté` (Airbus F&F 2022) |
| MLW / MZFW | 207 t / 195,7 t | `estimé` (à sourcer) |
| Carburant max | 110,5 t (39 + 39 + 32,5) | `estimé` à partir de 141 000 l (`documenté`) × 0,785 kg/l |
| VMO / MMO / VLE / VLO | 340 kt / 0,89 / 250 kt / 250 kt | `estimé` (à sourcer) |

Configurations (ΔC_L / C_L,max / ΔC_D / VFE en kt) — toutes `estimé`, VFE à sourcer :

| Conf | ΔC_L | C_L,max | ΔC_D | VFE |
|---|---|---|---|---|
| 0 | 0 | 1,45 | 0 | — |
| 1 | 0,45 | 1,85 | 0,010 | 255 |
| 2 | 0,50 | 2,05 | 0,024 | 222 |
| 3 | 0,65 | 2,25 | 0,040 | 205 |
| FULL | 0,85 | 2,50 | 0,065 | 186 |

### 4.3 Équations en vol

```
dV/dt = (T cos α − D) / m − g sin γ
dγ/dt = (L cos φ + T sin α − W cos γ) / (m V)
dψ/dt = L sin φ / (m V cos γ)
dh/dt = V sin γ
```
Position : avance de V cos γ · dt sur l'orthodromie au cap ψ. Intégration d'Euler explicite (cible : conserver Euler à pas fixe et vérifier la stabilité, ou passer en semi-implicite si les tests le demandent).

### 4.4 Loi de commande (approchée)

- Le manche commande un facteur de charge : n_z = cos γ / cos φ + manche × 1,4 (cabrer) ou 1,6 (piquer), borné à [−1 ; 2,5] lisse, [0 ; 2] volets sortis.
- α commandée = (C_L requis / effet de sol − C_L0) / C_Lα, suivie avec une constante de temps de 0,45 s.
- Protection d'incidence : α_prot = α_s − 3°, α_max = α_s − 1°. Protection d'assiette +30° / −15°. Inclinaison maintenue à 33° sans action, bornée à 67°.
- **Statut** : `estimé`, inspiré du principe public de la loi normale Airbus ; pas de loi alternate ni direct (cible EF-034).

### 4.5 Au sol

- Roulement 0,015 × charge normale ; frottement de freinage max μ = 0,42 (`estimé`).
- Freinage automatique : décélérations visées 1,7 / 2,5 / 3,2 / 4,0 m/s² selon le réglage (`estimé`), RTO au-delà de 72 kt.
- Direction : angle maximal de 70° sous 15 kt, 25° sous 40 kt, 7° sous 90 kt, 2° au-delà ; empattement 28 m (`estimé`, à sourcer).
- Rotation possible au-delà de 100 kt ; contact de queue au-delà de 11,5° d'assiette (`estimé`, à sourcer).
- Décollage quand L > W et V > 80 kt.

### 4.6 Contact et accidents

Toucher : hors piste (± 45 m de l'axe, ± 150 m au-delà des seuils) → accident ; vitesse verticale < −1 100 ft/min → accident ; > 12° d'inclinaison → contact aile ; train rentré → accident. Atterrissage « dur » signalé sous −600 ft/min. Seuils `estimé`.

## 5. Moteurs

- Poussée maximale au niveau de la mer : 374 kN par moteur (`documenté` : 374,5 kN, EASA TCDS E.111).
- Poussée disponible : T₀ (ρ/ρ₀)^0,75 (1 − 0,28 M) (`estimé`). Ralenti : 7 kN × ρ/ρ₀ (`estimé`). Inverseurs : −35 % de la poussée (`estimé`).
- Régimes : N1 = 21 + 77 d, N2 = 58 + 38 d, N3 = 68 + 28 d (d = demande 0-1) (`estimé`). Constantes de temps : montée 0,22/s, réduction 0,35/s.
- Consommation spécifique : 0,031 + 0,0175 × min(h/11 km ; 1,1) kg/(N·h) (`estimé`).
- Démarrage : air requis (conduit ≥ 25), carburant à N3 25 %, autonome à N3 67,5 % ; pic de température ≈ 700 °C (proche de la limite TCDS de démarrage, 700 °C TGT).
- Crans de manette (TLA) : −20 inverse max, 0 ralenti, 25 CL, 35 FLX/MCT, 45 TOGA (`estimé`).
- **Limite v0** : poussées additionnées, aucun moment de lacet. Cible : moment = (T₁ − T₂) × bras de levier (`à sourcer`), effet sur ψ et sur φ, compensation au palonnier.

## 6. Guidage et pilote automatique

- Modes verticaux : SRS, CLB, OP CLB, DES (profil géré par table d'altitudes avec segments de décélération), ALT*, ALT, ALT CRZ, V/S, G/S*, G/S, LAND, FLARE, ROLL OUT.
- Modes latéraux : NAV, HDG, LOC*, LOC.
- Auto-manette : SPEED, MACH, THR CLB, THR IDLE ; alpha floor → TOGA LK ; déconnexion au ralenti après l'atterrissage.
- Croisière : FL370, TAS de calcul 488 kt (`estimé`), aucune montée par paliers.
- Faisceau ILS géométrique (3°) sur la piste d'arrivée — **`fictif`** quand la piste n'a pas d'ILS publié (FMEE 12).
- Cible : transitions de modes décrites en tableau d'états et testées une par une ; prédictions FMS intégrées sur le profil.

## 7. Systèmes

Voir `A350_SYSTEMS_MAP.md` (modèle de chaque système, statut des commandes). Ordre de calcul dans un pas : électricité → APU → ADIRS → pneumatique → hydraulique → carburant → moteurs.

## 8. Carburant et performances

- Plan de vol v0 : délestage = 12,6 kg/NM × distance + 2 600 kg (`estimé`), réserve 5 %, dégagement forfaitaire. **Cible** : intégration sur le profil simulé (montée, croisière, descente) avec masse décroissante.
- Vitesses de décollage et d'approche : calculées à partir de V_S1g = √(2 m g / (ρ₀ S C_L,max)) (`estimé`).

## 9. Relief

- Image NASA Blue Marble recadrée (lon −6 à 64°, lat −28 à 54°, 797 × 933 px), altitude = valeur × 30 m ; aplanissement de 6 à 15 km autour des aéroports. Provenance de la carte d'altitude à vérifier.
- Cible : modèle numérique de terrain public (ETOPO / GMTED / SRTM, licence à vérifier), tuiles et niveaux de détail, élévation mise en cache.

## 10. Validation

| Contrôle | Valeur de référence v0 | Tolérance cible |
|---|---|---|
| Vol FMEE → LFPG en automatique | Toucher ≈ −255 ft/min | ± 150 ft/min |
| Durée calculée du vol | ≈ 11 h | à mesurer par test, puis ± 3 % |
| Montée initiale | FL370 atteint | à mesurer |
| Décélération freinage auto | selon réglage | ± 0,2 m/s² |

Ces valeurs deviennent les vols de référence de `TEST_STRATEGY.md`.
