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

The growth loop has been overhauled into an evolution system (see §13). Remaining ideas:

- **Tier / rarity on parts** — visual outline, particle aura, big stat jumps. Mining a rarer pickup feels like an event. **M**
- **More part archetypes** beyond the three implemented hybrids:
  - **Black**: AoE pulse around the part. **S**
  - **Chain-lightning** that arcs between enemies. **M**
  - **Shield emitter** (blue + yellow): regenerating HP buffer for adjacent parts. **M**
  - **Scattergun** (red + yellow): shotgun spread. **S**
  - **Treads** (green + yellow): extra speed AND threshold reduction. **S**
  - **Engine** (booster): adds a periodic dash. **S**
- **Part placement matters** — let the player drag-reorder parts at any time; e.g., front-mounted parts get +damage, rear parts get +HP. **M**
- **Combos / set bonuses** — e.g., 3 yellow in a row = bonus cargo, alternating blue / red = faster fire. **M**
- **Removable parts** — drop a part to swap it. Currently you can only grow the snake. **S**
- **Snake self-collision damage** when an enemy melee'd part gets pushed into another. **S**

## 3. Combat depth

- **Player base weapon** so an HP-1 chainless player isn't defenseless — a weak built-in pulse. **S**
- **Active ability key** (Space) — short dash with i-frames, scales with green parts. **S**
- **Weapon upgrade choices** — when a blue or red part hits a milestone (e.g., 3 kills), offer +damage / +fire-rate / +pierce. **M**
- **Status effects** — red missiles leave burning ground, green parts apply slow on contact. **M**
- **Better targeting** — let blue turrets prioritize closest threats (enemies actually shooting you) rather than just nearest. **S**

## 4. Enemies & AI

- **2 more enemy types** to fill out the bestiary:
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

## 13. Implemented: Evolution system

Replaces the old buy-from-pickups model. The cargo bars are now **evolution gauges**.

- Mining fills a color's gauge. When it pops, it triggers growth in that color and resets.
- **Append vs upgrade**: under 3 same-color parts → append a new segment; at 3+, the lowest-value matching part is upgraded (`+value`, refreshes size/HP/weapon stats, plays a grow tween).
- **Soft steering** (`1`-`4`): toggles a "preferred" color. Mining the preferred color fills its gauge ~1.5x faster, and a dot lights up in the HUD.
- **Threshold ramp**: each evolution makes the next one cost more for that color. Yellow parts globally reduce thresholds by 4% each (capped at 45%).
- **Hybrid evolutions**: if a partner gauge is at 80% or more when one fills, both are drained and a hybrid part spawns:
  - **plasma** (blue + red): slow, very-high-damage single shot, long range
  - **swarm** (green + red): rapid small homing missiles with light AoE
  - **rapid** (blue + green): very high fire-rate weak bullets
- **Booster pickups**: the old buy-pickup squares are now rare boosters that instantly fill ~60% of the matching gauge on contact (no cost).
- **Visual feedback**: at 80% gauge a soft halo appears around the player tinted by that color; on evolution a ring + label burst out; on upgrade the part briefly scales 1.6x; hybrid spawns flash the camera and show the recipe label.
