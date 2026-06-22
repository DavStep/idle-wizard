# Idle Wizard

JavaScript mobile game with a full ECS gameplay layer, room-view UI, Vite client, Capacitor Android package, and SpacetimeDB backend.

## Commands

```sh
npm install
npm run dev
npm run build
npm run build:dev
npm run build:prod
npm run lint
npm run test
npm run check
npm run release
npm run android:assembleDebug
npm run android:assembleProdDebug
npm run android:assembleRelease
npm run android:postDebugDiscord
```

`npm run check` is the default verification gate for code changes. It runs lint, tests, and a production web build.

`npm run dev`, `npm run build:dev`, and `npm run android:assembleDebug` load development env and enable console cheats. Production builds use `VITE_ENABLE_CHEATS=false`.

To post a debug APK to Discord after building, add a Discord channel webhook URL to ignored `.env.local`:

```sh
DISCORD_APK_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_FEATURE_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Add player-facing notes for the current `package.json` version to `PLAYER_CHANGELOG.md` before posting. The Discord script posts that changelog first, then uploads the APK. For one-off internal APK tests, set `DISCORD_APK_SKIP_CHANGELOG=1`.

For releases, also inspect recent logs, changelog notes, and git changes for a large player-facing feature such as guilds, advanced potion brewing, advanced gardening, event modes, or daily/weekly quests. When one exists, add a player-friendly `## <version>` section to `FEATURE_ANNOUNCEMENT.md` or set `DISCORD_FEATURE_ANNOUNCEMENT="..."`. Explain what the feature is and how it works, keep the tone friendly, and avoid balance-heavy numbers. The Discord script posts that feature spotlight to `DISCORD_FEATURE_WEBHOOK_URL` as a separate message before the normal changelog/APK post. For one-off internal APK tests, set `DISCORD_FEATURE_SKIP=1`.

Then run:

```sh
npm run android:postDebugDiscord
```

Full release automation is:

```sh
npm run release
```

It runs lint, tests, production web build, production debug-signed APK build, optional SpacetimeDB Maincloud publish when `spacetimedb/` changed, git commit/push from `main`, and Discord APK upload. Use `RELEASE_BACKEND=always` to force backend publish or `RELEASE_BACKEND=skip` to skip it.

For the full release checklist and post-release verification, use `docs/release-workflow.md`.

For a manually signed APK, run `npm run discord:postApk -- path/to/app.apk`. The script refuses `unsigned` APK filenames unless `DISCORD_APK_ALLOW_UNSIGNED=1` is set.

You can override the posted notes with `DISCORD_APK_CHANGELOG="..."` or `DISCORD_APK_CHANGELOG_FILE=path/to/notes.md`.

You can override the feature spotlight with `DISCORD_FEATURE_ANNOUNCEMENT="..."` or `DISCORD_FEATURE_ANNOUNCEMENT_FILE=path/to/feature-notes.md`.

In a dev build, open the browser console:

```js
cheats.help()
cheats.fillMana()
cheats.addCoin(1000)
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

Idle Wizard currently has five room pages: `Brewing`, `Garden`, `Workshop`, `Research`, and `Market`. Implemented systems include mana, coin, inventory items, seed summoning, garden planting/harvesting, active brewing, research, tasks, NPC/player market flows, prestige, automation, visual settings, world chat, leaderboard, account/session handling, save sync, feedback, maintenance, and trade alliance backend/UI flows.

Do not add new gameplay behavior beyond the explicit request. If requested gameplay behavior is unclear, ask before implementing.

## AI / Contributor Workflow

Start with:

- `AGENTS.md`: mandatory project rules for agents.
- `experience.md`: durable lessons and current traps.
- `docs/ai-workflow.md`: verification ladder, repo map, and safe edit workflow.
- `docs/architecture.md`: layer boundaries and feature layout.
- `docs/style.md` and `docs/ui-patterns.md`: required UI style/patterns.

If top-level docs conflict with source or tests, inspect source/tests and update the stale doc in the same change.

## Architecture

- `src/app`: application bootstrap and lifecycle.
- `src/viewport`: fixed `1080x2170` design surface scaling.
- `src/pages`: room-view UI pages. The default page is `Workshop`.
- `src/gameplay`: ECS-backed gameplay facades/managers.
- `src/rendering`: render shell and frame loop.
- `src/ecs`: ECS world, entity, component, and system managers.
- `src/backend`: SpacetimeDB and auth integration boundaries.
- `spacetimedb`: server module project.
- `android`: Capacitor Android wrapper for building the Vite game as an Android app.
- `docs/ai-workflow.md`: AI/contributor workflow and verification guide.
- `docs/style.md`: visual style definition.

See `AGENTS.md` for project rules future agents should follow.
