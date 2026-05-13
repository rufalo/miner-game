# Miner Snake — Improvement Ideas

A grouped, prioritized list of feature ideas for the game. Each entry is tagged with a rough size:

- **S** — a few hours
- **M** — half a day-ish
- **L** — multi-session feature

---

## 1. Core progression & meta-goals

The biggest weak point right now is "what am I working toward?". Adding any one of these gives the loop direction.

- **Player XP / level** based on minerals mined and enemies killed — unlocks more chain slots, base stats, or new body-part colors. **M**
- **Boss arenas** per tier — a fixed boss at the center of each tier ring that drops a guaranteed top-tier body part. **L**
- **Win condition / endgame** — destroy a "core" deep in tier 4, or survive a final wave. Without one, mining feels endless. **M**
- **Persistence between runs** — save best run, total minerals collected, parts attached, etc. via `localStorage`. **S**
- **Daily seed mode** — fixed world layout per day to compare scores. **S**

## 2. Snake / body-part depth

The growth loop has been overhauled into an evolution system (see §13) and a combo / alternative-follow system has been added on top (see §15). Remaining ideas:

- **Tier / rarity on parts** — visual outline, particle aura, big stat jumps. Mining a rarer pickup feels like an event. **M**
- **More part archetypes** beyond the three implemented hybrids and the PRISM:
  - **Black**: AoE pulse around the part. **S**
  - **Chain-lightning** that arcs between enemies. **M**
  - **Shield emitter** (blue + yellow): regenerating HP buffer for adjacent parts. **M**
  - **Scattergun** (red + yellow): shotgun spread. **S**
  - **Treads** (green + yellow): extra speed AND threshold reduction. **S**
  - **Engine** (booster): adds a periodic dash. **S**
- **Part placement matters** — let the player drag-reorder parts at any time; e.g., front-mounted parts get +damage, rear parts get +HP. **M**
- **More combo recipes** beyond STACK / RAINBOW / BRANCH:
  - **3 same color** (already auto-upgrades, but a STACK-style consolidation could fold them into a single mega-orbital). **S**
  - **TRIANGLE** (3 of any kind adjacent) → 3-unit rotating formation, evenly spaced. **M**
  - **CROWN** (2 yellow + 2 green adjacent) → speed + threshold reduction halo. **S**
- **Removable parts** — drop a part to swap it. Currently you can only grow the snake. **S**
- **Snake self-collision damage** when an enemy melee'd part gets pushed into another. **S**

## 3. Combat depth

- **Player base weapon** so an HP-1 chainless player isn't defenseless — a weak built-in pulse. **S**
- **Active ability key** (Space) — short dash with i-frames, scales with green parts. **S**
- **Weapon upgrade choices** — when a blue or red part hits a milestone (e.g., 3 kills), offer +damage / +fire-rate / +pierce. **M**
- **Status effects** — red missiles leave burning ground, green parts apply slow on contact. **M**
- **Better targeting** — let blue turrets prioritize closest threats (enemies actually shooting you) rather than just nearest. **S**

## 4. Enemies & AI

Persistent **hunter** and **swarmer wave** systems were added (see §14).
Remaining ideas:

- **More enemy types** to fill out the bestiary:
  - **Splitter**: large enemy that breaks into 2–3 fast minions on death. **M**
  - **Sniper**: very long range, telegraphed laser beam. **M**
  - **Bomber / kamikaze**: slow, explodes on contact. **S**
- **Mini-boss per tier** distinct from regular enemy spawns (larger silhouette, unique attack). **L**
- **Enemy aggro chaining** — pulling one enemy alerts nearby zone members instead of triggering them individually. **S**
- **Smarter pathfinding** — current straight-line pursuit gets stuck on… nothing right now, but if you add obstacles this becomes necessary. **M**
- **Enemy patrols** that walk a loop between two points instead of pure home-wander, so the world feels less static. **S**

## 5. World & exploration

The bigger world is great but mostly empty between zones. Some content to fill it:

- **Points of interest**: abandoned base, crashed wreck, ancient deposit with rare mineral. **M**
- **Biomes / visual variety** — change grid color and background per tier so you *feel* progression. **S**
- **Asteroid fields** — clusters of small obstacles you can shoot through, with hidden minerals inside. **M**
- **Wandering "caravan" neutral NPC** that trades minerals at non-1:1 ratios. **L**
- **Hazards** — radiation zones that drain HP, gravity wells that pull the snake. **M**
- **Map borders that look intentional** — energy wall, not just invisible bounds. **S**

## 6. Economy / minerals

- **Mineral conversion** — sell N red for M blue at refinery POIs. Solves "I have 200 red but need green" deadlock. **M**
- **Mineral overflow** turns into score / XP instead of being capped useless. **S**
- **Cargo drop on death** — leave behind a recoverable wreck (Roguelite-style). **M**
- **Deposit purity** — value (size) determines yield per second too, not just total. Big = fast + lots, small = slow trickle. **S**

## 7. UI / UX

- **Minimap** — top-right corner showing tier rings, enemy zones (fog-of-war until visited), your snake. Huge QoL on the bigger map. **M**
- **Damage numbers / floating text** when you hit enemies and when you take damage. **S**
- **Range indicators** — translucent circle around blue / red parts so you can see their reach. **S**
- **Cargo full warning** — pulse the bar red, refuse to auto-mine when full instead of silently capping. **S**
- **Pickup affordability hint** — show pickup cost in red if you can't afford. **S**
- **Pause menu** (Esc) with restart / quit. **S**
- **Tutorial / first-time hints** — first deposit shows "walk close to mine", first pickup shows "afford with red". **S**
- **Death recap screen** — minerals mined, enemies killed, max tier reached, time alive. **S**

## 8. Visual polish ("juice")

- **Trail FX behind the snake** — fading dots when moving fast, especially with green parts. **S**
- **Bigger impact effects** — short freeze-frame (1–2 frames) and screen shake on big hits / explosions. **S**
- **Death animations** — enemies spin and fade, shatter into mineral fragments. **S**
- **Player squash / stretch** when changing direction quickly. **S**
- **Particle dust** on movement, more if speed is high. **S**
- **Better mineral visuals** — slow rotation, shimmer at high tier. **S**
- **Lighting** — soft glow around projectiles, missile trails, player headlamp cone in dark biome. **M**

## 9. Audio

You currently have zero audio — adding even a tiny bit transforms feel.

- **Mining hum**, **bullet / missile fire**, **explosion**, **part attach**, **enemy hurt**, **player hurt**, **death**. **S** each
- **Music** — ambient drone in safe zone, more intense in danger rings. **M**
- **Master / SFX / music volume sliders** in pause menu. **S**

## 10. Controls / accessibility

- **Mouse aim mode** — hold right-click to aim turrets manually instead of auto-target. **S**
- **Gamepad support** — Phaser has a `gamepad` plugin, two sticks map cleanly. **M**
- **Rebindable keys** stored in localStorage. **S**
- **Color-blind palette toggle** — current 4 colors are decent but a swap-to-shape mode (circles vs triangles vs etc.) helps. **M**

## 11. Performance / tech

- **Sprite culling** — disable update on enemies very far away from the camera. The big world makes this worth doing. **M**
- **Spatial hash for targeting** — replace the linear enemy scan in `Targeting.js` once you have hundreds of enemies. **M**
- **Object pooling** for bullets / missiles / particles — avoids GC hitches in long sessions. **M**
- **Code splitting** in Vite — current bundle is ~1.5 MB; you can chunk Phaser separately. **S**
- **Auto-update through Electron** if you ever publish builds. **L**

## 12. Multiplayer / replayability (ambitious)

- **Local co-op** — second snake on shared screen with WASD vs arrows. Phaser supports it well. **L**
- **Online co-op** via WebRTC or a tiny Node relay. **L**
- **Score leaderboard** (server or local). **M**

---

## Suggested order for biggest impact at smallest cost

If aiming for one short polish session, this is a good order:

1. **Minimap** (M) — fixes the "where is everything?" pain on the big map
2. **Damage numbers + screen shake on big hits** (S) — instant feel upgrade
3. **Cargo-full warning + pickup-affordability hint** (S) — clarity
4. **Dash on Space + base weapon** (S) — combat without parts no longer helpless
5. **Death recap + persistent best run** (S) — gives the loop closure

## 14. Implemented: Persistent hunter pressure

Adds an always-on threat layer on top of the zone-based enemies:

- **Hunter spawner** ([`src/systems/HunterSpawner.js`](src/systems/HunterSpawner.js)) maintains a target number of active hunters at all times. Target scales with run time and the highest tier reached:  
  `target = base(1) + 0.6 × minutes + 0.5 × maxTier`, capped at 9.
- Hunter spawn rate gets faster as the player pushes into outer tiers (`spawnIntervalMs` drops by `spawnIntervalDropPerTier`).
- **Hunter enemy** ([`HunterEnemy.js`](src/entities/enemies/HunterEnemy.js)): no home, never de-aggros, always pursues the player. Red 4-point star silhouette, moderate speed and HP, dangerous in numbers.
- **Swarmer waves**: every 45–75 s a pack of 4–7 fast fragile melee enemies (+1 per tier) is launched at the player from off-screen with a `WAVE INCOMING — N swarmers` banner and brief camera shake.
- **Swarmer enemy** ([`SwarmerEnemy.js`](src/entities/enemies/SwarmerEnemy.js)): tiny yellow dot, very fast, 6 HP, low damage but rapid contact. Lateral wobble in flight so packs read as a flock.
- **Off-screen spawn**: hunters and swarmers always appear just outside the camera, clamped to world bounds, so things never visibly pop in.
- **Player base pulse weapon buffed** (1.7 shots/s, 6 damage, 360 px range) so a chainless player has a reliable starter weapon against hunters.
- **HUD readout** under the tier line: `hunters N/target   wave in Xs`.
- **Minimap markers**: hunters appear as bright red dots, swarmers as small yellow dots, both updated every frame.

## 13. Implemented: Evolution system

Replaces the old buy-from-pickups model. The cargo bars are now **evolution gauges**.

- Mining fills a color's gauge. When it pops, it triggers growth in that color and resets.
- **Append vs upgrade**: under 3 same-color parts → append a new segment; at 3+, the lowest-value matching part is upgraded (`+value`, refreshes size/HP/weapon stats, plays a grow tween).
- **Soft steering** (`1`-`4`): toggles a "preferred" color. Mining the preferred color fills its gauge ~1.5x faster, and a dot lights up in the HUD.
- **Threshold ramp**: each evolution makes the next one cost more for that color (`thresholdPerEvolution`). On top of that, **every** evolution (append OR upgrade, any color) bumps the threshold of all four gauges by `thresholdPerGlobalEvolution`, so repeatedly upgrading also makes future evolutions harder. Yellow parts globally reduce thresholds by 4% each (capped at 45%).
- **Hybrid evolutions**: if a partner gauge is at 80% or more when one fills, both are drained and a hybrid part spawns:
  - **plasma** (blue + red): slow, very-high-damage single shot, long range
  - **swarm** (green + red): rapid small homing missiles with light AoE
  - **rapid** (blue + green): very high fire-rate weak bullets
- **Booster pickups**: the old buy-pickup squares are now rare boosters that instantly fill ~60% of the matching gauge on contact (no cost).
- **Visual feedback**: at 80% gauge a soft halo appears around the player tinted by that color; on evolution a ring + label burst out; on upgrade the part briefly scales 1.6x; hybrid spawns flash the camera and show the recipe label.

## 16. Implemented: Draft-pick (pick 3) system

Roguelite-style upgrade picks integrated with the evolution loop.

- **Trigger**: every `DRAFT.everyNEvolutions` (default 3) growth events (any color, append OR upgrade). Hybrid evolutions count for 2.
- **Pause-modal UI** ([`UIScene.showDraft`](src/scenes/UIScene.js)): 3 horizontal cards with title + description. Click a card or press `1` / `2` / `3`. The game is fully paused (physics + player input) until the player picks.
- **HUD progress bar** under the parts line shows progress to the next pick and total drafts taken so far.
- **Card pool** ([`DRAFT_CARDS` in GameScene](src/scenes/GameScene.js)) with `eligible(player, scene)` filters so cards that don't apply (e.g. "Fuse Lowest 2 Tail" with <2 tail parts) never show up.
- **Persistent player buffs** are stored on `player.boosts`:
  - `redDamageMult` — multiplies damage of `missile`, `swarm`, `plasma`.
  - `blueFireRateMult` — multiplies fire rate of `turret`, `rapid`, `plasma`, `prism`.
  - `greenSpeedMult` — multiplies the contribution of green parts to player speed.
  - `pulseDamageMult`, `pulseFireRateMult` — for the built-in pulse weapon.
  - `dashCooldownMult` — `<1` makes the dash recharge faster.
  - `extraYellowReduction` — stacks on top of the yellow-part threshold discount, capped by `EVOLUTION.yellowReductionCap`.
  - `player.maxTailBonus` — adds to `PLAYER.maxTailSegments`. Used everywhere via `player.maxTail()`.
- **Boost application**: `BodyPart.applyKindStats()` re-reads `player.boosts` every time it runs; `Player.refreshAllPartStats()` re-applies stats on all existing parts after a card is picked, so boosts retroactively cover everything you already own.
- **Maintenance cards**: `Fuse Lowest 2 Tail` merges the two weakest tail parts into one (the larger keeps its kind, total value carries over) so a slot opens up; `Recycle Smallest Tail` deletes the smallest part outright. Both end with `player.chainChanged()` so branch / split-tail offsets re-flow.
- **State**: `pendingDraft = { options: [...] }` on GameScene; cleared on `applyDraftChoice` or scene restart.

## 15. Implemented: Combo & alternative-follow system

Body parts can now auto-combine and adopt different follow patterns than the basic trailing snake.

- **STACK** — whenever two adjacent same-kind weapon parts (turret, missile, plasma, swarm, rapid) end up next to each other in the chain, they immediately fuse:
  - Both parts are consumed.
  - A new **orbital twin** spawns that circles the player at ~46 px radius.
  - The twin keeps the same weapon kind but with `×1.55` fire rate and `×1.30` damage (`COMBO.stackFireRateMult` / `COMBO.stackDamageMult`).
  - Total `value` carries over, so size and base stats scale accordingly.
  - Combo detection re-runs after each fuse, so a long mono-color tail collapses into multiple orbitals.
- **RAINBOW (PRISM)** — once all four primary colors (R, G, B, Y) exist anywhere in the chain, a one-shot **PRISM orbital** spawns at ~78 px radius and ~1 rad/s.
  - Fires 4 bullets in a small fan, each tinted one of the four primary colors.
  - Sprite cycles through the four primary tints to advertise its presence.
- **BRANCH (split-tail)** — once the trail has `COMBO.branchAtParts` trail-mode parts attached, the chain unlocks split-tail mode:
  - All trail parts past the threshold receive a lateral offset perpendicular to the trail tangent, alternating left / right.
  - Visually the tail splits into two parallel ribbons trailing behind the snake.
  - New growth keeps alternating sides, so the more you grow the wider the split.
  - Tuned with a small default **max tail** (`PLAYER.maxTailSegments`, default 4): `branchAtParts` is set so split-tail kicks in early enough to be visible before you hit the cap.
- **Follow modes** are now first-class on `BodyPart`:
  - `'trail'` — the original snake polyline; supports `lateralOffset` for branching.
  - `'orbit'` — circles the player at a fixed radius and angular speed (used by STACK twins and the PRISM).
- **Damage / death** — orbital parts still take damage from enemy bullets and missiles; on death they reindex the chain like any other part.
- **HUD** — the parts line now shows combo state, e.g. `parts R:1 G:1 B:2 Y:1   hyb P:1   [orb:1 PRISM SPLIT]`.
