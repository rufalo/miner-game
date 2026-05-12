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

- **WASD** or **Arrow keys**: move
- **Hold left mouse**: move toward the cursor

## Colors

- **Red** minerals -> Red body parts fire **missiles** at nearby enemies
- **Blue** minerals -> Blue body parts are **turrets** that fire bullets
- **Green** minerals -> Green body parts boost **movement speed**
- **Yellow** minerals -> Yellow body parts boost **cargo capacity**

Walk next to a mineral deposit to auto-mine it. Walk next to a colored square pickup with enough matching minerals to auto-purchase it. It attaches to the tail of your snake and gives its bonus passively.

The further you travel from origin, the richer the deposits and pickups - but enemy zones guard them.
