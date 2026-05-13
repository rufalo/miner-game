# Miner Snake — Improvement Ideas

A grouped, prioritized list of feature ideas for the game. Each entry is tagged with a rough size:

- **S** — a few hours
- **M** — half a day-ish
- **L** — multi-session feature

---

## 1. Core progression & meta-goals

The biggest weak point right now is "what am I working toward?". Adding any one of these gives the loop direction.

- **Player XP / level** based on minerals mined and enemies killed — unlocks more chain slots, base stats, or new body-part colors. **M**
- **Boss arenas** per tier — implemented as tier mini-bosses (see §17).
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

- ~~**Player base weapon** so an HP-1 chainless player isn't defenseless — a weak built-in pulse.~~ ✅ implemented.
- ~~**Active ability key** (Space) — short dash with i-frames, scales with green parts.~~ ✅ implemented (dash).
- ~~**Weapon upgrade choices** — when a blue or red part hits a milestone (e.g., 3 kills), offer +damage / +fire-rate / +pierce.~~ ✅ delivered via the draft-pick system + new weapon-mod cards (`Splinter Rounds`, `Twin Missile`, `Cluster Missiles`, `Volatile Tail`).
- ~~**More active abilities** beyond dash.~~ ✅ implemented:
  - **Q — Shockwave** (`SHOCKWAVE` in `src/config.js`): radial AoE pulse + outward knockback + brief i-frames. Visualized via `castShockwave` in `GameScene`. ~8 s base cooldown; `Shockwave+` and elite `Resonance Pulse` scale damage / radius / cooldown.
  - **E — Overcharge** (`OVERCHARGE`): 4 s buff window. Pulse weapon and every body-part weapon read `player.overchargeUntil` and apply `OVERCHARGE.fireRateMult × OVERCHARGE.damageMult`. UI bar shows an active window timer while the buff lasts, then refills as cooldown. `Overcharge+` and elite `Singularity Charge` scale duration / cooldown.
- **Status effects** — red missiles leave burning ground, green parts apply slow on contact. **M**
- **Better targeting** — let blue turrets prioritize closest threats (enemies actually shooting you) rather than just nearest. **S**
- **More active abilities to consider**: targeted teleport / blink, deployable turret, magnet pull for mineral pickups, time-slow burst. **M**

## 4. Enemies & AI

Persistent **hunter** and **swarmer wave** systems were added (see §14).
Remaining ideas:

- **More enemy types** to fill out the bestiary:
  - ~~**Splitter**: large enemy that breaks into 2–3 fast minions on death.~~ ✅ implemented — orange 4-circle cluster, on-death spawns `splitterMinionCount` mini-chasers (+0.5 per tier) that aggro instantly. Tier 2+.
  - ~~**Sniper**: very long range, telegraphed laser beam.~~ ✅ implemented — cyan reticle, kites away to `sniperKeepDistance`, draws a thin red follow-line for `sniperTelegraphMs`, then locks angle and fires a very fast bright beam. Tier 3+.
  - ~~**Bomber / kamikaze**: slow, explodes on contact.~~ ✅ implemented — orange spiked mine, charges player and detonates within `bomberFuseRadius`. AoE damages player + body parts (60%) + nearby enemies (50%). Also detonates on death. Tier 1+.
  - **Shielder / dome enemy**: projects a small shield bubble that blocks bullets/missiles from one direction, must be flanked. **M**
  - **Healer**: orbits other enemies, slowly heals them; killing it first becomes a tactical priority. **M**
  - **Teleporter / ambusher**: blinks every few seconds toward the player's blind side. **M**
  - **Tank artillery**: very slow, very long range, lobs arcing AoE projectiles you can sidestep. **M**
- **Mini-boss per tier** distinct from regular enemy spawns (larger silhouette, unique attack). **L**
- **Enemy aggro chaining** — pulling one enemy alerts nearby zone members instead of triggering them individually. **S**
- **Smarter pathfinding** — current straight-line pursuit gets stuck on… nothing right now, but if you add obstacles this becomes necessary. **M**
- **Enemy patrols** that walk a loop between two points instead of pure home-wander, so the world feels less static. **S**

## 5. World & exploration

The bigger world is great but mostly empty between zones. Some content to fill it:

- ~~**Points of interest**: abandoned base, crashed wreck, ancient deposit with rare mineral.~~ ✅ partial — **boulder pits** seeded per tier (see §19); other POI types still wishlist.
- **Biomes / visual variety** — change grid color and background per tier so you *feel* progression. **S** (partial: tier tinting is in)
- **Asteroid fields** — clusters of small obstacles you can shoot through, with hidden minerals inside. **M**
- ~~**Wandering "caravan" neutral NPC** that trades minerals at non-1:1 ratios.~~ ✅ partial — **neutral miners** are in (compete with the player for nodes, enrage on attack); proper *trading* NPCs still wishlist.
- **Hazards** — radiation zones that drain HP, gravity wells that pull the snake. **M**
- **Map borders that look intentional** — energy wall, not just invisible bounds. **S**
- **Geysers / sinkholes / crystal fields** — keep building out the landmark menagerie now that the BoulderPit / Boulder pattern is in place. **M**
- **WorldEvent scheduler** — global timer that fires periodic events ("storm", "migration") with broadcast hooks for systems to react. **L**

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

## 20. Implemented: Recipe / cauldron tail (major redesign)

Body parts are no longer permanent weapon platforms - they are **ingredients** in a **recipe**. The snake tail is now a cauldron: 4 ingredients auto-combine into a **player upgrade**, then the tail empties.

### Player ask

> instead of the body part doing the stuff i want them to be like ingredients part of a recipe and when i collect 3 or 4 of them then they combine and trigger an upgrade depending on the pieces... each type gives maybe 3 types of values with different amounts ... blue and yellow parts give shield, blue and red give missiles, if blue value is really high then laser

### Design

- **Tail = ingredient slot list** (max == `RECIPE.slots`, default 4). Visually unchanged - still the same snake trail with color-tinted segments.
- **Each color has 3 essence contributions** (see README table). Primary essence is the highest; secondary/tertiary lead to natural cross-color combos. Essences are scaled by ingredient `value`.
- **Combine resolves in priority** (in [`RecipeSystem.resolve`](src/systems/RecipeSystem.js)):
  1. mono (per-color threshold: red/blue 2 → laser/inferno; green/yellow 3 → blink/barrier) -> color's ultimate
  2. rainbow (all 4 primaries) -> prism
  3. pair recipes (configured list) -> special (shield / missiles / dash strike / regen barrier / heavy turret / sniper)
  4. fallback: highest summed essence -> mapped upgrade (turret / sniper / burn / speed / regen / armor / harvest / grenade / overcharge), with **weaponEssenceBias** so POWER/AIM/HEAT/BLAST/CHARGE win close ties over non-weapon essences
- **Same upgrade twice tiers it up** (I -> II -> III -> IV). Each tier's stats live in flat arrays in [`UPGRADES`](src/config.js) so adding a new tier is one array entry.

### What got retired

- **BodyPart.update** is short-circuited before the weapon dispatch path. Trail follow, prism cycling, mark glow all stay; weapon firing, on-hit AoE, burn payload, overcharge buff all stop.
- **Player.recomputeMarkAggregate** / **recomputeSetBonuses** zero out and return - mark passive ticks (regen, aura, lifesteal, dash echo) are gone from the per-part path. Equivalent effects are available as **recipe upgrades** instead, which is more legible.
- **Player.recomputeStats** no longer reads green/yellow parts for speed / cargo discount; those moved to the recipe Speed and Harvest upgrades.
- **Hybrid evolutions** (`spawnHybridEvolution`) and the **STACK / RAINBOW / BRANCH combo system** (`checkCombos`) are no-ops. The recipe pair / mono / rainbow rules replace them with a single, predictable resolver.

### What got added

- [`src/config.js`](src/config.js): `RECIPE` block (essences, pair / mono / rainbow tables, fallback map) and a flat `UPGRADES` catalog with per-tier stat arrays.
- [`src/systems/RecipeSystem.js`](src/systems/RecipeSystem.js): pure resolver - takes an ingredient list, returns an upgrade key + label + ruleType.
- [`src/systems/RecipeUpgrades.js`](src/systems/RecipeUpgrades.js): `installOrUpgrade`, `recomputePassives` (folds every armament into `player.recipeBoosts` plus shield bookkeeping), `tickArmaments` (per-frame fire), `tickPassives` (shield + HP regen), `absorbDamage` (shield layer for `takeDamage`).
- `Player`: `armaments` list + `recipeBoosts` + `maxShield` / `shield` state. Dash threads recipe `dashCdMult` / `dashIframeBonusMs` / `dashStrike`. Overcharge threads recipe duration + cd bonuses. `takeDamage` runs damage through `damageReduction` then `absorbDamage` then HP.
- `GameScene.triggerEvolution` is now the single growth entry point: appends one ingredient per gauge fill and auto-fires `combineRecipe` whenever the tail reaches `RECIPE.slots`. Old `spawnEvolution` / `spawnHybridEvolution` / `checkCombos` are stub no-ops kept around so we can revive per-part weapons later if we ever want a hybrid mechanic.
- `combineRecipe`: snapshots ingredients, resolves via `RecipeSystem`, tweens every part into the player center and explodes them, then `installOrUpgrade`s the result and pops a banner with the tier name.
- UI: a `recipe` line replaces the parts summary. Shows current R / G / B / Y ingredient counts, slot fill (`slots N/4`), live recipe preview (`next  SHIELD`) so the player can steer mining choices, and a `gear` list of installed upgrades + tiers. New shield bar under the HP bar only appears while the player has a max shield.

### Next-step wishlist

- **Manual combine button** (e.g. C key) to fire with fewer than 4 ingredients for emergency situational upgrades. Config slot `RECIPE.manualCombineMinSlots` is already reserved.
- **Upgrade slot cap** - currently you can stack any number of upgrades; eventually choose 4-6 max with the ability to *replace* an existing one on combine.
- **Recipe book / pity timer** - first time you trigger each recipe shows a one-time "RECIPE DISCOVERED" banner with the ingredient pattern.
- **Visual ingredient orbs** floating around the player as an alternative to the tail visualization (we already have the data, just need new visuals).
- **More recipes** - 5+ specific pair combos, rare "high-value-of-X" thresholds (e.g. one Blue ingredient of value 12+ alone -> Laser even without 3 blues).

## 19. Implemented: World features (landmarks + neutral miners)

First slice of "the world does things on its own". Two complementary systems, both seeded once by the Spawner and then self-sustaining.

### Boulder pits (`src/entities/world/BoulderPit.js`)

Authored landmarks placed per tier ring at angles offset from bosses.

- **State machine**: `idle -> telegraph -> idle`. Idle pits skip per-frame work via an early-out range check against the player.
- **Eruption**: when the player enters `LANDMARK.pit.aggroRange`, the pit shows a flashing orange telegraph ring at the player's *current* position for `telegraphMs`, then launches a `Boulder` toward that locked spot. Player has the full telegraph window + flight time to clear the impact zone.
- **Boulder** (`src/entities/world/Boulder.js`) is a non-physics Phaser image that lerps x/y over `boulderArcMs` with a sine y-offset for the arc, and grows a drop shadow on the ground at the impact target so it stays readable even when the camera moves. On impact: cam shake + explosion FX + AoE damage to player (full), body parts (half), and **enemies in radius (85% damage)** so kiting under one is a real tactic.
- **Destructible**: pits have HP scaling with tier; player bullets / missiles damage them via `onBulletHitLandmark` / `onMissileHitLandmark`. Destruction scatters 3-5 mineral chunks via `onLandmarkDestroyed`, so blowing them up is a positive economic action.
- **Minimap**: brown ring while idle, hot orange filled circle the instant they fire.

### Neutral miners (`src/entities/NeutralMiner.js`)

Non-hostile actors that compete with the player for the map's mineral economy.

- Extends `Enemy` so they inherit physics body, takeDamage flash, burn ticks (you can light them on fire), and `onDeath -> scene.onEnemyKilled` for the regular kill bookkeeping.
- AI swap: **peaceful mode** scans for the nearest `MineralDeposit` every `rescanIntervalMs`, paths to it, then drains via the new `MineralDeposit.drainBy(amount)` method at ~3 Hz. When a node is fully drained the neutral calls `scene.onDepositDepleted(deposit)` which destroys it and triggers the regular spawner respawn flow.
- **Enrage** on first damage: turns red, speeds up, gets a contact damage value, sets `aggro = true`, and from then on behaves like a chaser via the shared `Enemy.attemptContactDamage` path. So killing one isn't free DPS - they hit back briefly.
- **Reward on death**: drops a small mineral chunk of a random primary color via `scene.spawnMineralDrop` *and* the standard enemy-kill drop, so the player gets a tangible payout but has to accept the brief hostility.
- **Minimap**: teal dot while peaceful, hot red while enraged.

### Plumbing

- New physics group `this.landmarks` on `GameScene` with `runChildUpdate: true` so pits tick themselves; player bullets / missiles can overlap-damage it.
- `Spawner.seedLandmarks()` and `Spawner.seedNeutralMiners()` run once at world seed time; the spawner tracks both lists.
- Config in [`config.js`](src/config.js): `LANDMARK.pit.*` and `NEUTRAL.miner.*` blocks expose every tunable.
- BootScene generates three new textures programmatically (`landmark_pit`, `boulder`, `neutral_miner`) so nothing is committed as image assets.

Next-step ideas (kept in §5): geysers / sinkholes / crystal fields reusing the BoulderPit / Boulder skeleton, plus a global `WorldEvent` scheduler that broadcasts hooks (`onDepositDepleted`, `onLandmarkDestroyed`, etc) for other systems to react to.

## 18. Implemented: Mark tiers + set bonuses

Layers qualitative upgrades on top of the value-based evolution numbers. Built into [`BodyPart.js`](src/entities/BodyPart.js) and [`Player.js`](src/entities/Player.js); table-driven so adding a new kind / ability is a one-line config change.

- **Mark tier (1..4)** is derived from a part's accumulated `value` via `MARK.thresholds` (8 / 18 / 32). `BodyPart.applyKindStats()` recomputes the mark every time the part is built or upgraded and calls `applyMarkAbilities()` to merge each MARK_ABILITIES row up to that tier into `this.markEffects`.
- **Ability flags** are read at fire time inside `weaponInfo()` so newly-promoted parts immediately use the new behavior:
  - `multishot`: extra projectiles in a symmetric fan (turret / rapid / missile / swarm)
  - `pierce`: stacks with the `Splinter Rounds` draft card (turret / rapid / plasma / prism)
  - `critChance`: rolled per shot; double damage, white tint + slightly bigger bullet (turret / rapid)
  - `burn`: `{ dps, durMs }` payload rides on bullets / missiles; `Enemy.preUpdate()` ticks DoT at 4 Hz and shows orange damage numbers (missile / swarm)
  - `onHitAoeRadius` + `onHitAoeDamageMult`: plasma Mark 3 splash AoE on every bullet hit
  - `damageMult` / `fireRateMult`: pure multipliers folded into `applyKindStats`
- **Passive ability marks** (green / yellow) are aggregated in `Player.recomputeMarkAggregate()` so the player update loop applies them in one place:
  - `regenHpPerSec`: green Mark 2 trickle heal
  - `auraDps` + `auraRadius`: green Mark 3 damage aura ticks at 5 Hz with a faint pulse FX
  - `dashEchoMs`: green Mark 4 leaves a Shockwave at the dash start position
  - `gaugeFillBonus`: yellow Mark 2 percent bonus to all gauge fills
  - `lifestealPer5`: yellow Mark 3 heals per 5 raw units mined (gold heal numbers)
  - `doublePickupChance`: yellow Mark 4 rolls in `addMinerals` to double the tick
- **Mark glow**: each part above Mark 1 grows a soft outer ring tinted by mark (white M2 -> gold M3 -> orange M4), gently pulsing.
- **Promotion FX**: `GameScene.spawnMarkPromotionFx(part)` plays a burst ring + floating `MARK II/III/IV` text + small camera shake at Mark 3+.

**Set bonuses** layer composition-of-chain rewards on top of marks. `Player.recomputeSetBonuses()` runs inside `chainChanged()` and stores a flat object on `this.setBonuses`:

- **Pyrotechnician** (3+ red): missile AoE x1.15. Applied at fire time so it works with Twin/Tri missile.
- **Marksman** (3+ blue): turret range x1.15.
- **Greased** (3+ green): +0.5 HP/s passive regen (stacks with green Mark 2).
- **Logistics** (3+ yellow): +10% to the preferred-color mining multiplier.
- **Polychrome** (1+ of each primary): +5% global damage and +5% global speed. Speed multiplier feeds into `recomputeStats`; damage multiplier composes into every part's damage inside `applyKindStats`.

HUD parts line now shows the highest mark as `M I/II/III/IV` plus the active set keys (e.g. `[M III MARKSMAN POLYCHROME]`), so the build state is readable at a glance.

## 17. Implemented: Tier mini-bosses + biome tinting

Each tier ring (1..maxTier) has a single seeded **boss** placed at ~85% of the way to the outer ring, on a different compass heading per tier so they're spread around the world.

- **BossEnemy** ([`src/entities/enemies/BossEnemy.js`](src/entities/enemies/BossEnemy.js))
  - Stats scale with tier: `BOSS.baseHP + BOSS.hpPerTier * tier` (tier 1 = 480 HP, tier 4 = 1140 HP at current tuning), `contactDamage` 18 with a 700 ms cooldown.
  - Idle until the player closes within `BOSS.aggroRange` (760 px). From then on, slowly pursues.
  - Two telegraphed attack patterns:
    - **Ring shot**: a soft halo expands for ~700 ms, then `BOSS.ringBulletCount + floor(tier/2)` bullets fire outward at evenly spaced angles.
    - **Missile barrage**: a yellow telegraph for ~900 ms, then `BOSS.barrageMissileCount + floor(tier/2)` homing missiles fan toward the player.
  - **BERSERK** below `BOSS.berserkHpRatio` HP (30%): speed × `BOSS.berserkSpeedMult` (1.9), attacks come 35% faster, a banner + camera shake announces the phase.
  - Each boss carries its own floating HP bar + "TIER N BOSS" label drawn above the sprite, visible whenever the boss is on screen.
- **Spawner.seedBosses()** ([`src/systems/Spawner.js`](src/systems/Spawner.js)) places them once at world seed; they're added to the regular `enemies` group so existing bullet/missile overlaps and AI scaffolding work without changes.
- **Reward** ([`GameScene.onBossKilled`](src/scenes/GameScene.js)):
  - Big explosion + camera flash + shake.
  - One high-value mineral (value 12–16) of each primary color scattered around the corpse.
  - Banner: `TIER N BOSS DEFEATED`.
  - **Guaranteed ELITE draft pick** queued immediately, independent of the regular `evolutionsSinceLastDraft` counter. Elite drafts draw from a boss-only pool (`tier: 'elite'` in `DRAFT_CARDS`) plus the maintenance pool. Elite cards have roughly 2x the magnitude of regular cards (e.g. `+2 Max Tail`, `+35% Red Damage`, `Iron Hide`, `Photonic Surge`, `Phase Shift`, `Tail Genesis`). UIScene renders them with a gold frame and a `BOSS REWARD - ELITE UPGRADE` banner.
- **Minimap**: bosses render as bright red diamonds (slightly larger than the hunter / swarmer dots) so the player can navigate toward them deliberately.
- **Run stats / best run**: `stats.bossesDefeated` is tracked, shown on the death recap, and weighted heavily in the best-run score (`+200 per boss kill`).

### Biome tinting

Subtle per-tier background tints (`BIOME.tierColors`, drawn as semi-transparent filled annuli at depth -95) so each ring has its own color mood instead of the whole 16000-px world being flat black. Inner rings paint over outer ones from the outside in. Tuned to be a hint of color, not a wall.

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
