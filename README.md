# Miner Snake

A small top-down Phaser 3 game where you control a circle, mine colored minerals, attach upgrade "body parts" that drag behind you like a snake, and fight enemies that guard richer deposits further from spawn.

Packaged as an Electron desktop app with a Windows launcher.

## Run as a desktop app

Double-click **`Miner Snake.bat`** on the Desktop. It will, on first run, install dependencies and build the game, then open it in an Electron window. Subsequent runs just open the window.

You can also run the launcher directly from the project folder:

```bat
launch.bat
```

Or via npm:

```bash
npm start          # build + launch in Electron
npm run play       # launch in Electron (assumes build is already in dist/)
```

## Run in a browser (Vite dev server)

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Controls

- **WASD** / **Arrow keys** — move
- **Hold left mouse** — move toward the cursor
- **Space** — dash (i-frames, short cooldown)
- **1 / 2 / 3 / 4** — prefer a color (red / green / blue / yellow). Mining the preferred color fills its evolution gauge ~1.5× faster.
- **Esc** — pause / resume
- **R** — restart (when paused or dead)

## Colors

- **Red** — adds a **missile launcher** segment (homing AoE).
- **Blue** — adds a **turret** segment (bullets).
- **Green** — adds a **speed boost** segment.
- **Yellow** — reduces all evolution thresholds (faster growth across the board).

## Evolution system

Cargo bars are **evolution gauges**. Walk next to a mineral deposit to auto-mine it; that color's gauge fills as you collect. When a gauge tops up, it pops:

- **Under 3 parts of that color attached** → a new segment of that color is appended to your snake.
- **3 or more attached** → the system upgrades your weakest matching part instead (bigger, more HP, stronger weapon).
- **Tail cap** — you can only have **`PLAYER.maxTailSegments` trail segments** (default 4). Orbitals from combos do not count. When the tail is full, new evolutions **upgrade** an existing trail part instead of lengthening the snake. Raise the cap later via meta / upgrades (constant lives in `src/config.js`).
- **If another gauge is at 80%+** when one pops, both drain and a **hybrid part** is spawned:
  - **PLASMA** (blue + red) — slow, very heavy single shot at long range.
  - **SWARM** (green + red) — rapid small homing missiles.
  - **RAPID** (blue + green) — high-rate weak bullets.

Each evolution makes the next one for that color cost more, **and every evolution (append or upgrade, any color) globally bumps the threshold of every other gauge**, so the snake is meant to get harder to grow the bigger it gets. The colored squares scattered around are **boosters** that instantly fill ~60% of the matching gauge for free.

## Combos & alternative follow patterns

The snake isn't just a single straight tail. Parts can auto-combine and adopt different follow patterns:

- **STACK** — whenever two same-kind weapon parts end up adjacent (e.g. two missile reds, or two plasmas), they instantly **fuse into an orbital twin** that circles the player at a fixed radius, firing faster and harder than either source part.
- **RAINBOW (PRISM)** — once your chain contains at least one of every primary color (R, G, B, Y), a **PRISM orbital** spawns. It orbits at a wider radius and fires a 4-color bullet spread.
- **BRANCH (split-tail)** — once your trail has 6 parts attached, it visually splits: every new trail-mode part alternates to either side of the trail, so the snake grows into two parallel ribbons behind you.

The HUD parts line shows combo state in brackets, e.g. `[orb:2 PRISM SPLIT]`.

## Draft picks

Every few evolutions (3 by default, tune with `DRAFT.everyNEvolutions`) the game pauses and offers **three random cards**:

- Click one or press **1 / 2 / 3** to pick.
- A small **draft progress bar** under the parts line on the HUD fills as you evolve.

Card categories include:

- **Passive boosts** — `+20% red damage`, `+20% blue fire rate`, `+25% green speed bonus`, `+5% threshold discount`, `+50% pulse damage`, `+25% pulse fire rate`, `-20% dash cooldown`, `+20 max HP`.
- **Maintenance** — `Full Heal`, `Repair All Parts`, **`Fuse Lowest 2 Tail`** (combine your two weakest tail segments to free a slot), **`Recycle Smallest Tail`** (remove your weakest tail segment to free a slot).
- **Capacity** — `+1 Max Tail` raises `PLAYER.maxTailSegments` by 1 for this run.

Cards that don't apply (e.g. "Fuse Lowest 2 Tail" when you have <2 tail segments) are filtered out of the pool.

## Tier mini-bosses

Each of the 4 outer tier rings has a seeded **boss** at ~85% of the way to the outer edge, placed at a different compass heading per tier. Bosses sit idle until you close to ~760 px, then start pursuing and alternating **two telegraphed attacks**:

- **Ring shot** — a halo expands for ~0.7 s, then a wide spread of bullets fires outward.
- **Missile barrage** — a yellow telegraph for ~0.9 s, then a fan of homing missiles launches at you.

Below 30% HP a boss goes **BERSERK** (nearly 2× speed, attacks ~35% faster). On the minimap they show as bright red diamonds.

**Reward for defeating a boss**:

- Big explosion + camera flash.
- One high-value mineral of each primary color (R / G / B / Y) scattered around the corpse.
- A **guaranteed ELITE draft pick** — gold-framed cards drawn from a boss-only pool with ~2x the magnitude of regular cards (e.g. `+2 Max Tail`, `+35% Red Damage`, `Iron Hide`, `Photonic Surge`, `Phase Shift`, `Tail Genesis`). Maintenance cards (heal / repair / fuse) can still appear so the choice isn't always pure DPS.
- Counted in your run stats + best run (`+200` to the best-run score).

The world background also has a subtle **biome tint** per tier so you feel each ring you cross.

## Threats

Two kinds of pressure:

- **Enemy zones** in the outer tier rings — sit still until you wander near, then attack. Guard the richer deposits.
- **Hunters and swarms** — the longer a run lasts, the more red *hunter* enemies relentlessly seek you out from off-screen, and occasional swarmer waves charge you in packs. Pressure scales with run time and max tier reached. Watch the bottom-left readout: `hunters N/target   wave in Xs`.

The further you travel from origin, the richer the deposits and the nastier the enemy mix.
