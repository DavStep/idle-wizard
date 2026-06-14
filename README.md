# Idle Wizard

JavaScript mobile game scaffold with a full ECS architecture, Vite client, and SpacetimeDB backend setup.

## Commands

```sh
npm install
npm run dev
npm run build
npm run build:dev
npm run build:prod
npm run lint
npm run release
npm run android:assembleDebug
npm run android:assembleProdDebug
npm run android:assembleRelease
npm run android:postDebugDiscord
```

`npm run dev`, `npm run build:dev`, and `npm run android:assembleDebug` load development env and enable console cheats. Production builds use `VITE_ENABLE_CHEATS=false`.

To post a debug APK to Discord after building, add a Discord channel webhook URL to ignored `.env.local`:

```sh
DISCORD_APK_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Then run:

```sh
npm run android:postDebugDiscord
```

Full release automation is:

```sh
npm run release
```

It runs lint, tests, production web build, production debug-signed APK build, optional SpacetimeDB Maincloud publish when `spacetimedb/` changed, git commit/push from `main`, and Discord APK upload. Use `RELEASE_BACKEND=always` to force backend publish or `RELEASE_BACKEND=skip` to skip it.

For a manually signed APK, run `npm run discord:postApk -- path/to/app.apk`. The script refuses `unsigned` APK filenames unless `DISCORD_APK_ALLOW_UNSIGNED=1` is set.

In a dev build, open the browser console:

```js
cheats.help()
cheats.fillMana()
cheats.addGold(1000)
cheats.addCrystal(10)
cheats.addItem('sageSeed', 5)
cheats.completeResearch('unlockSeed:sageSeed')
```

## GitHub Pages

This repository can publish the Vite build as a GitHub Pages project site once GitHub Pages is enabled. On a free GitHub account, this repo must be public for Pages:

```txt
https://davstep.github.io/idle-wizard/
```

The Pages workflow builds with `--base=/idle-wizard/` so Vite asset paths work under the project URL. Visitors still need a hosted `wss://` SpacetimeDB backend before the live game can run outside local development.

To publish the backend to SpacetimeDB Maincloud:

```sh
npm run stdb:publish:maincloud
```

Optional Google login is enabled when `VITE_GOOGLE_AUTH_CLIENT_ID` is set. For GitHub Pages, store that value as the Actions repository variable `GOOGLE_AUTH_CLIENT_ID`.

SpacetimeDB requires the `spacetime` CLI:

```sh
npm run stdb:start
npm run stdb:publish
npm run stdb:generate
```

## Current Scope

Herbs, potions, and potion recipes exist only as item concepts. Planting, harvesting, active brewing, selling, and other gameplay mechanics will be added only when requested.

## Architecture

- `src/app`: application bootstrap and lifecycle.
- `src/viewport`: fixed `1080x2170` design surface scaling.
- `src/pages`: room-view pages. The default page is `Workshop`.
- `src/gameplay`: ECS-backed gameplay facades for mana, inventory, and seed summoning.
- `src/rendering`: render shell and frame loop.
- `src/ecs`: ECS world, entity, component, and system managers.
- `src/backend`: SpacetimeDB and auth integration boundaries.
- `spacetimedb`: server module project.
- `android`: Capacitor Android wrapper for building the Vite game as an Android app.
- `docs/style.md`: visual style definition.

See `AGENTS.md` for project rules future agents should follow.
