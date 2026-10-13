# Piranha Time

A first-person pixel art fishing game in a living Amazon river, built with JavaScript and Canvas. All art and audio are generated locally; the game needs no credentials, external APIs, image downloads, or database.

## Play

Bring home **five river fish** before you lose your **three hooks**.

- Click open water to cast minnow-shaped bait. With a keyboard, aim with the arrow keys and press **Space**.
- When the float dips and **BITE!** appears, press **Space** or the reel button to set the hook.
- **Hold Space or hold the reel button** to pull the fish toward the canoe. Release to lower tension before the line snaps.
- Red-bellied piranhas cost a hook when landed. You can cut the line to let one go, also at the cost of a hook.
- **Escape** pauses the game. **R** starts a fresh trip. The field guide explains the food chain. Sound is optional.

The river keeps changing: catchable fish hunt minnows and flee piranhas. Piranhas ignore live minnows, hunt larger fish, and investigate motionless bait. Their hunger increases with time, raising their speed and hunting range. Eating a fish calms them and gives them a slower digestion period. Fish naturally arrive and depart.

## Run locally

Install Node.js **22.12 or newer** (Node.js 24 LTS is recommended), then clone the repository and start the game:

```sh
git clone https://github.com/kimleeng/pirahna_time.git
cd pirahna_time
npm ci
npm run dev
```

Open the local address printed by Vite, usually localhost on port **5173**. If you already cloned the repository, run `git pull` from its directory before installing dependencies. No environment variables, credentials, or extra services are required to play.

## Test and build

```sh
npm test          # food chain, hunger, fishing, tension, win/loss, pause
npm run build    # production bundle in dist/
npm run preview  # run the production build locally
```

To run the browser tests on macOS, Windows, or Linux, install Playwright's Chromium once:

```sh
npx playwright install chromium
npm run test:e2e
```

Browser tests use Playwright's Chromium by default. If `/usr/bin/chromium` is installed, they use that instead; `CHROMIUM_PATH` can override the browser executable. Tests start their own server on port **4174**, which must be free. Screenshots and other browser test artifacts are saved to the ignored `test-results/` directory.

## Cloud environment

The cloud checkout is `/workspace/pirahna_time`. To refresh its dependencies without writing outside the workspace:

```sh
cd /workspace/pirahna_time
NPM_CONFIG_CACHE=/workspace/.cache/npm npm ci --no-audit --no-fund
npm run dev -- --port 5173 --strictPort
```

Use the existing isolated checkout for cloud tasks; no additional Git worktree is needed. Restart the development server in each new task: live processes are not retained with the filesystem snapshot.
