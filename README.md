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
- **Q** — **Shockwave** (radial AoE pulse + knockback, ~8 s cooldown, brief i-frames so it doubles as a panic button)
- **E** — **Overcharge** (4 s buff: 2× fire rate, +20% damage on every weapon, ~18 s cooldown)
- **1 / 2 / 3 / 4** — prefer a color (red / green / blue / yellow). Mining the preferred color fills its evolution gauge ~1.5× faster.
- **Esc** — pause / resume
- **R** — restart (when paused or dead)

## Active abilities

Beyond the always-on weapons, the player has two on-demand abilities. The HUD shows their cooldown bars stacked under the dash bar (orange = Shockwave, gold = Overcharge).

- **Shockwave (Q)** — instant radial AoE around the player. Deals damage to every enemy in `SHOCKWAVE.radius`, applies an outward knockback impulse, and grants ~180 ms of i-frames so it doubles as a panic button. ~8 s cooldown.
- **Overcharge (E)** — 4 s buff window. **Every** weapon (built-in pulse, turrets, missiles, plasma, swarm, rapid, prism) fires at 2× rate with +20% damage. ~18 s cooldown. The overcharge bar fills as a duration timer while active, then drains as the cooldown refills.

Draft cards (regular and elite) can extend, strengthen, and shorten the cooldown of both abilities.

## Colors

- **Red** — adds a **missile launcher** segment (homing AoE).
- **Blue** — adds a **turret** segment (bullets).
- **Green** — adds a **speed boost** segment.
- **Yellow** — reduces all evolution thresholds (faster growth across the board).

## Recipe system (cauldron tail)

The snake tail is now a **cauldron**: each segment is an **ingredient**, not a weapon platform. When the tail reaches **4 ingredients** it auto-combines into a **player upgrade**, the segments fly into the player, and the tail is empty for the next recipe.

### How ingredients spawn

Cargo bars are still **evolution gauges**. Mining a deposit fills the matching color's gauge. When a gauge tops up, **one ingredient of that color is appended to the tail**. Booster pickups (the colored squares around the world) still instantly fill ~60% of a gauge for free.

Each filled gauge globally ramps the cost of the *next* one, so later ingredients are slower to acquire — but they're also worth more `value`, which feeds into the essence math below.

### How combine resolves

Every ingredient contributes 3 essence values, with its **primary essence the highest** and the secondaries leading to natural cross-color combos. Totals are multiplied by ingredient `value` so a big late-game ingredient swings the recipe much harder than an early-game one.

| Color | Primary | Secondary | Tertiary |
|---|---|---|---|
| **Red** | POWER (3) | HEAT (2) | BLAST (1) |
| **Blue** | AIM (3) | CHARGE (2) | POWER (1) |
| **Green** | SWIFT (3) | VITAL (2) | AIM (1) |
| **Yellow** | FORTIFY (3) | HARVEST (2) | VITAL (1) |

When the cauldron fires it checks rules **in priority order**:

1. **Monochrome ultimate** — 3+ of the same color → that color's "ultimate":
   - 3× Blue = **LASER** (piercing high-rate beam)
   - 3× Red = **INFERNO** (fast burning bullets)
   - 3× Green = **BLINK** (much shorter dash CD + longer i-frames)
   - 3× Yellow = **BARRIER** (huge regenerating shield)
2. **Rainbow** — at least one of every primary color → **PRISM** (multi-color fast bullets).
3. **Special pair recipe** — both colors present:
   - Blue + Yellow = **SHIELD**
   - Blue + Red = **MISSILES**
   - Red + Green = **DASH STRIKE** (shockwave on every dash)
   - Green + Yellow = **REGEN BARRIER** (smaller shield + HP regen)
   - Red + Yellow = **HEAVY TURRET** (big slow piercing bullets)
   - Blue + Green = **SNIPER** (long-range high-damage single shot)
4. **Fallback** — highest summed essence picks the upgrade: POWER → Turret, AIM → Sniper, HEAT → Burn aura, SWIFT → Speed, VITAL → Regen, FORTIFY → Armor, HARVEST → Harvest, BLAST → Grenade, CHARGE → Overcharge.

The HUD shows a live **`next: <upgrade>`** preview while the tail is filling, so you can steer your mining toward the recipe you want.

### Tier-up

Getting the **same upgrade** from a later combine **tiers it up** (I → II → III → IV). Each tier roughly doubles fire rate / damage / radius for weapons, or stacks the passive value for stat upgrades.

Your installed upgrades are listed on the HUD parts line, e.g. `gear  Turret II  Shield I  Speed III`.

## Draft picks

Every few evolutions (3 by default, tune with `DRAFT.everyNEvolutions`) the game pauses and offers **three random cards**:

- Click one or press **1 / 2 / 3** to pick.
- A small **draft progress bar** under the parts line on the HUD fills as you evolve.

Card categories include:

- **Passive boosts** — `+15% red damage`, `+15% blue fire rate`, `+18% green speed bonus`, `+4% threshold discount`, `+30% pulse damage`, `+18% pulse fire rate`, `-15% dash cooldown`, `+15 max HP`.
- **Weapon mods (new)** — `Splinter Rounds` (turret / rapid / pulse bullets pierce one extra enemy), `Twin Missile` (missile parts fire 2 missiles per volley), `Cluster Missiles` (missiles spawn 6 shrapnel bullets on impact), `Volatile Tail` (body parts detonate in an AoE blast when destroyed).
- **Active-ability mods (new)** — `Shockwave+` (+15% Q damage, +10% radius), `Overcharge+` (+1 s buff duration).
- **Maintenance** — `Full Heal`, `Repair All Parts`, **`Fuse Lowest 2 Tail`** (combine your two weakest tail segments to free a slot), **`Recycle Smallest Tail`** (remove your weakest tail segment to free a slot).
- **Capacity** — `+1 Max Tail` raises `PLAYER.maxTailSegments` by 1 for this run.

Cards that don't apply (e.g. "Twin Missile" once you already have it) are filtered out of the pool.

## Tier mini-bosses

Each of the 4 outer tier rings has a seeded **boss** at ~85% of the way to the outer edge, placed at a different compass heading per tier. Bosses sit idle until you close to ~760 px, then start pursuing and alternating **two telegraphed attacks**:

- **Ring shot** — a halo expands for ~0.7 s, then a wide spread of bullets fires outward.
- **Missile barrage** — a yellow telegraph for ~0.9 s, then a fan of homing missiles launches at you.

Below 30% HP a boss goes **BERSERK** (nearly 2× speed, attacks ~35% faster). On the minimap they show as bright red diamonds.

**Reward for defeating a boss**:

- Big explosion + camera flash.
- One high-value mineral of each primary color (R / G / B / Y) scattered around the corpse.
- A **guaranteed ELITE draft pick** — gold-framed cards drawn from a boss-only pool with ~2× the magnitude of regular cards (e.g. `+2 Max Tail`, `+35% Red Damage`, `Iron Hide`, `Photonic Surge`, `Phase Shift`, `Tail Genesis`, **`Tri-Missile Salvo`**, **`Resonance Pulse`**, **`Singularity Charge`**). Maintenance cards (heal / repair / fuse) can still appear so the choice isn't always pure DPS.
- Counted in your run stats + best run (`+200` to the best-run score).

The world background also has a subtle **biome tint** per tier so you feel each ring you cross.

## World features

The world isn't just enemies and minerals — there are **automatic landmarks** and **non-hostile actors** that affect what's happening even when you're not looking.

### Boulder pits (landmarks)

Each tier ring has a few **boulder pits** seeded at fixed angles (offset from the boss positions). They look like dark craters with a faint orange glow.

- **Idle** while you're far away.
- When you cross into ~720 px of the pit, it picks your current position, plays a **flashing orange telegraph ring** for ~1.1 s, then **lobs a chunky arcing boulder** at that spot. A drop-shadow on the ground tells you where it'll land.
- **Impact**: AoE damage + knockback to **you, your tail (half damage), and any enemies caught in the blast**. Kiting a hunter swarm under a pit you've already triggered is a real tactic.
- Pits are **destructible** (~220 HP, scaling with tier). Killing one explodes the crater and scatters **3–5 mineral chunks** as a payout, so blowing them up is a positive economic action.
- On the minimap they're brown rings; they pulse bright orange the instant they fire.

### Neutral miners

Sprinkled across every ring (and a couple inside the safe zone) are **non-hostile miners**: gray-blue circles with a pickaxe-slash silhouette.

- They **path to the nearest mineral deposit** on their own and **drain it slowly**, competing with you for the world's economy. Let one work uninterrupted and they'll empty a node you wanted.
- They **stay peaceful unless you attack them**. The first hit immediately **enrages** them — they turn red, speed up, and start hunting you like a chaser.
- Killing one drops a **small mineral chunk** of a random color *plus* the standard enemy-kill mineral, so they're a meaningful tactical choice: ignore them and you keep the peace, attack them and you get loot but make a new hostile.
- On the minimap they show as teal dots (peaceful) or hot red dots (enraged).

## Threats

Two kinds of pressure:

- **Enemy zones** in the outer tier rings — sit still until you wander near, then attack. Guard the richer deposits.
- **Hunters and swarms** — the longer a run lasts, the more red *hunter* enemies relentlessly seek you out from off-screen, and occasional swarmer waves charge you in packs. Pressure scales with run time and max tier reached. Watch the bottom-left readout: `hunters N/target   wave in Xs`.

### Enemy bestiary

Common across tiers:

- **Chaser** — runs straight at you, melee touch damage.
- **Dasher** — periodically dashes a short distance to close the gap.
- **Gunner** — kites at medium range and fires bullets.

Introduced at tier 2+:

- **Missile** — long-range homing missile launcher.
- **Bomber** *(new)* — orange spiked "sea mine" silhouette. Charges you and **detonates on contact (or on death)** for AoE damage to you *and* your tail. The blast also half-damages other enemies caught in it — bait clusters when you can.
- **Splitter** *(new)* — chunky 4-circle cluster. Slow melee bruiser. **On death it bursts into 3 fast mini-chasers** that immediately aggro you.

Introduced at tier 3+:

- **Sniper** *(new)* — cyan reticle. Keeps you at long range, draws a thin red **telegraph line** for ~1.2 s, then fires a fast bright **beam** in the locked direction. Stand still and it will hit; **dash sideways** at the lock moment to dodge.
- **Brute** — heavy, high-HP melee.

Hunters and swarmers (mobile pressure, independent of zones):

- **Hunter** — bright red star, persistent off-screen seeker.
- **Swarmer** — small yellow circle, spawns in waves and rushes you.

On the minimap each special type has its own color/shape so you can read the threat at a glance (cyan cross = sniper, orange dot = bomber/splitter, etc.). Bosses still show as bright red diamonds.

The further you travel from origin, the richer the deposits and the nastier the enemy mix.
