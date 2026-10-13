# STREET TYCOON — Lagos Hustler Empire

A Nigerian 2D idle RPG and hustler-empire simulator. Start broke in a rented room on the mainland, work the streets and the keyboard, upgrade your tools, unlock districts, buy businesses, and build a **Hustler Kingdom** — a crew you recruit, train, assign and pay through transparent revenue-share contracts. Chase fame and luxury, or keep it legit; either way the city keeps score through five separate reputation values and a heat/investigation system.

It is an installable, offline-first **Progressive Web App** with **no backend**: every byte of game state lives in the player's browser (IndexedDB), and content updates ship as static frontend releases.

> All characters, businesses, districts, activities and events are fictional. "Risky opportunities" are abstract game mechanics with in-game consequences; the game contains no real-world instructions for anything illegal.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, static export `output: "export"`), React 19, TypeScript strict |
| Styling | Tailwind CSS 4, Lucide icons |
| World | Phaser 3.90 (arcade physics, tilemaps, procedurally generated pixel art) |
| State | Zustand (live) + Dexie/IndexedDB (durable saves, ad manifest, ad stats) |
| Validation | Zod (save files, migrations, ad manifest) |
| PWA | Serwist-based service worker (`src/sw/sw.ts`) built with esbuild + `@serwist/build` after `next build` |
| Tests | Vitest (simulation/economy/persistence/ads) and Playwright (end-to-end) |

## Commands

```bash
npm install          # Node 20.9+ (tested on Node 22)
npm run dev          # development server at http://localhost:3000
npm run build        # next build (static export to out/) + service worker
npm start            # serve out/ locally at http://127.0.0.1:4173 (what Playwright uses)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest unit suite (42 tests)
npm run test:e2e     # playwright (builds must exist: run `npm run build` first)
npm run icons        # regenerate PWA icons and demo ad images (scripts/generate-icons.mjs)
```

In development (`npm run dev`) the service worker is not registered; the PWA/offline behaviour is verified against the production export (`npm run build && npm start`).

## Installing the PWA

Open the deployed site, then:

- **Android / Chrome, Edge:** use the browser's *Install app* / *Add to Home screen* entry, or the "Install app" button in the main menu (shown when the browser offers the prompt).
- **iOS Safari:** Share → *Add to Home Screen*.
- **Desktop Chrome / Edge:** click the install icon in the address bar or use the "Install app" button.

Once the first load has cached the shell (63 precached files, ~2.6 MB), the game runs fully offline. A banner appears when a new version is deployed; the update is only applied when the player clicks *Update now*, so a running session is never interrupted.

## Project layout

```
src/
  app/                 Next.js routes: / (game), /admin/ads (ad dashboard), layout, globals.css
  ads/                 adService: manifest loading, selection, rotation, local stats, safe link opening
  components/
    game/              GameRoot (lifecycle, ticking, autosave), GameCanvas (Phaser bridge), interactions, joystick
    hud/               HUD, navigation, activity ticker, tutorial tips
    dialogs/           dialogue overlay, action sheet, confirm, events, offline summary, toasts
    screens/           profile, skills, inventory, jobs, quests, map, phone/social, bank/investments,
                       property/garage/fashion, businesses, shop, stats/achievements, settings/saves, help
    management/        Hustler Kingdom: HQ & facilities, crew roster, member profile, recruitment, assignments, contracts
    ads/               AdSlot placement component
    admin/             AdDashboard (client-side campaign editor)
    pwa/               service worker registration, update banner, install button, offline indicator
    ui/                primitives (Button, Modal, Panel, ProgressBar, Tabs, …)
  data/                ALL content: balance.ts, activities, districts (maps, interiors, shops), items, skills,
                       npcs (+dialogue), quests, businesses/properties/vehicles/investments, crew, events,
                       achievements, backgrounds, ads/defaultManifest.ts, version.ts
  game/                Phaser: createGame, scenes (Boot, World), world (tileset, sprites, mapBuilder), engine/events (typed bus)
  simulation/          Pure, testable game logic: engine (deterministic time steps / offline catch-up), economy,
                       idle activities, businesses, crew/hk, risk, events, progression (skills, quests,
                       achievements, districts), shop, investments, prestige, npc dialogue, modifiers, effects
  persistence/         Dexie db, saveManager (slots, export/import), migrations + content reconciliation
  schemas/             Zod schemas: save.ts, ads.ts
  store/               Zustand stores: gameStore (domain layer; every change goes through `act`), uiStore
  sw/                  service worker source
  types/               core domain types
tests/unit             Vitest suites        tests/e2e   Playwright suites
scripts/               build-sw.mjs, serve-static.mjs, generate-icons.mjs, png.mjs
docs/                  CONTENT.md (adding content & balance), ADS.md (campaign workflow), DEPLOY.md
```

### Architecture in one paragraph

`simulation/` is plain TypeScript with no React or Phaser imports. `simulate(state, now, {offline})` advances a save from its last simulated timestamp in fixed 60-second steps: energy, business accrual, activity completion and queueing, crew work cycles and training, investments, day boundaries (living costs, heat decay, morale/loyalty), random events (auto-resolved offline with their safe default, max 3), then quests, perks and achievements. The same function runs the live 1-second tick and the offline catch-up, so income is never counted twice; the RNG state is stored in the save for determinism. The Zustand `gameStore` wraps every mutation in `act()` (clone → mutate → settle → commit) and autosaves (debounced, periodic, on tab hide/unload). Phaser only renders: it reads a snapshot, emits typed events (`interaction:activate`, `player:moved`, …) on the shared bus, and React resolves them into domain actions. Modifiers from perks, gear, property, vehicles, HK facilities and legacy are collected by one function (`computeModifiers`) that every economic formula consumes.

## Adding content, balancing, ads, deployment

See [docs/CONTENT.md](docs/CONTENT.md), [docs/ADS.md](docs/ADS.md) and [docs/DEPLOY.md](docs/DEPLOY.md).

## What is tested

- **Economy:** purchases deduct correctly and fail without mutation on insufficient funds; balances never go negative; crew revenue split matches contract terms (worked example ₦100k gross / ₦20k costs / 25% → ₦20k member, ₦60k HK); business revenue accrues and collects exactly once; upgrade costs scale; no activity pays before completion; skills/gear multiply rewards.
- **Idle:** offline earnings use elapsed time and respect caps; repeated reloads never duplicate rewards; concurrent slots and queue; crew/business income identical whether simulated in one jump or many ticks; training completes offline; large/backwards clock jumps are capped and flagged; living costs and heat decay per game day; offline events auto-resolve.
- **Progression:** XP curve and perks (e.g. +1 activity slot), district gating and travel costs, quest auto-start and stage gating with rewards, dialogue effects, HK recruitment capacity/eligibility/share limits, contract renegotiation rules and logging, achievements, prestige reset rules.
- **Persistence:** IndexedDB round trip, corrupt states rejected and never overwrite a good save, v0→v1 migration, dangling content references dropped, export/import round trip, slot isolation.
- **Ads:** unsafe URLs/SVG data URIs/HTML text rejected, disabled and out-of-schedule campaigns never selected, placement/priority/targeting/rotation, manifest round trip and duplicate ids.
- **Content integrity:** launch minimums, every cross-reference resolves, buildings never overlap roads or each other, every map builds.
- **End-to-end (Playwright):** character creation, keyboard and touch movement, NPC interaction (keyboard and tap), earning from a job, buying an upgrade, save → reload → continue, world map and phone, importing a save, renting an HQ, recruiting, training, assigning work and verifying the payout split, the ad dashboard create/validate/export flow, offline shell load through the service worker, manifest/icon delivery.

## Known limitations

- Saves are device-local; there is no cloud sync and clearing site data erases progress (export backups from *Save management*).
- The ad dashboard edits a **local** manifest only; global campaigns ship by editing `src/data/ads/defaultManifest.ts` and redeploying. Anything needing shared state (central auth, global analytics, remote image hosting, live advertiser management) requires a backend and is deliberately not faked.
- Impression/click counters are per device.
- Pixel art is generated procedurally at boot (no external art assets); there is no audio.
- The world is explorable per district with three interiors (room, cybercafé, HK HQ); shops and most buildings open management panels at the door rather than full interiors.
- Playwright movement tests run against software WebGL in CI containers; rendering is slower there than on real devices.
