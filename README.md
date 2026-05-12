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
- **If another gauge is at 80%+** when one pops, both drain and a **hybrid part** is spawned:
  - **PLASMA** (blue + red) — slow, very heavy single shot at long range.
  - **SWARM** (green + red) — rapid small homing missiles.
  - **RAPID** (blue + green) — high-rate weak bullets.

Each evolution makes the next one for that color cost a bit more. The colored squares scattered around are **boosters** that instantly fill ~60% of the matching gauge for free.

## Threats

Two kinds of pressure:

- **Enemy zones** in the outer tier rings — sit still until you wander near, then attack. Guard the richer deposits.
- **Hunters and swarms** — the longer a run lasts, the more red *hunter* enemies relentlessly seek you out from off-screen, and occasional swarmer waves charge you in packs. Pressure scales with run time and max tier reached. Watch the bottom-left readout: `hunters N/target   wave in Xs`.

The further you travel from origin, the richer the deposits and the nastier the enemy mix.
