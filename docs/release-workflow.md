# Release Workflow

Use this runbook for every player release. The release is complete only when the
account-compatible APK is posted, `main` is pushed, GitHub Pages deploy succeeds,
and any required Maincloud backend publish is verified.

## Release Definition

- Player APK: Discord post with changelog and either an APK attachment or its
  GitHub Release download link.
- Web client: GitHub Pages deploy from `main`.
- Android live update: checksum-bound web bundle from the same Pages deployment.
- Backend: SpacetimeDB Maincloud publish when `spacetimedb/` changed.
- GitHub Release/tag: created automatically when the APK exceeds Discord's
  attachment limit.

The current player APK channel uses a minified release build signed with the
existing Android debug key. That keeps the package on the same certificate used
by the current Android Google account flow while keeping the APK small enough
for Discord uploads. Do not switch the default signing certificate until the new
SHA-1 is registered and account connect/restore is tested on device.

## Preflight

Start from `main`. By default, the release command bumps `package.json` and
`package-lock.json` by one patch version, stages all current changes, commits,
and pushes.

```sh
git status --short --branch
```

Check the current version and prepare notes for the next patch version:

```sh
node -p "require('./package.json').version"
```

- Add `## <next-version>` to `PLAYER_CHANGELOG.md`.
- If the release has a large player-facing feature, add `## <next-version>` to
  `FEATURE_ANNOUNCEMENT.md`.
- Write Discord notes from developers to players and describe Idle Wizard on its
  own terms. Never mention other game names, source projects, ports, or where an
  implementation came from; keep that provenance in developer-facing notes.
- Make sure `.env.local` has `DISCORD_APK_WEBHOOK_URL`.
- If a feature announcement exists, `.env.local` must also have
  `DISCORD_FEATURE_WEBHOOK_URL`.
- True production release-key builds are available with `RELEASE_APK=release`,
  but they require a Google OAuth-registered Android certificate. Configure
  these env vars or matching Gradle properties before using that mode:
  `IDLE_WIZARD_RELEASE_STORE_FILE`,
  `IDLE_WIZARD_RELEASE_STORE_PASSWORD`,
  `IDLE_WIZARD_RELEASE_KEY_ALIAS`, and
  `IDLE_WIZARD_RELEASE_KEY_PASSWORD`.
- Tell the release command explicitly when not bumping or not pushing:
  `npm run release -- --no-version-bump` or `npm run release -- --skip-git`.

The default backend mode publishes whenever `spacetimedb/` differs from the
latest `release:` commit, including changes already committed before the release
command starts. Use `RELEASE_BACKEND=always` to force a resync of Maincloud.

## Normal Release

Run:

```sh
npm run release
```

This performs:

1. patch version bump unless disabled
2. player changelog/feature announcement preflight
3. `npm run lint`
4. `npm test`
5. production web build with `/idle-wizard/` base
6. minified Android release APK build, signed with the current debug key
7. optional SpacetimeDB Maincloud publish
8. git commit and push from `main`
9. wait for the pushed commit's `Checks` and `Deploy GitHub Pages` workflows to
   succeed
10. host an oversized APK in a versioned GitHub Release when needed
11. Discord changelog, optional feature spotlight, and APK attachment or link

Discord is the final release action. If either required GitHub Actions workflow
fails or does not start, the command exits without posting any Discord messages
or APK.

The production Android sync builds into isolated `tmp/android-dist` and lets
Capacitor copy that directory without rewriting image formats. Runtime raster
assets remain PNG-only across web and Android; asset dimensions and content
must be optimized without substituting another format.

Pages also builds `tmp/ota-dist` with the Capacitor-safe `/` base, packages it
under `/ota/bundles/`, and publishes `/ota/latest.json`. APKs from `0.3.49`
onward check that manifest and stage compatible web updates for the next app
restart. See `docs/ota-updates.md`. Raise `ota.config.json`'s
`minimumNativeVersion` whenever the web bundle starts requiring a native change.

The release preflight also requires the semantic version to increase Android's
`versionCode`, and it verifies the built APK manifest before upload. The Android
mapping reserves three digits each for minor and patch versions, so transitions
such as `0.2.104` to `0.3.0` remain installable upgrades.

If a Pixel 8 Pro is available for device QA, confirm it is connected before the
device build:

```sh
adb devices -l
```

Then install and run a production Android build on it:

```sh
npm run android:run:prod
```

Use explicit modes only when needed:

```sh
RELEASE_BACKEND=always npm run release
RELEASE_BACKEND=skip npm run release
RELEASE_APK=debug-release npm run release
RELEASE_APK=prod-debug npm run release
RELEASE_APK=release npm run release
npm run release -- --no-version-bump
npm run release -- --version-bump minor
npm run release -- --skip-git
npm run release -- --apk path/to/file.apk
```

`debug-release` is the default. `prod-debug` preserves the older larger debug
APK shape and is useful only if the minified release build needs comparison.
`release` is for the future true production keystore path.

## Verification

Confirm local git matches remote:

```sh
git fetch --prune origin
git status --short --branch
git log -1 --oneline --decorate
git ls-remote --heads origin main
```

Confirm GitHub Actions:

```sh
gh run list --repo DavStep/idle-wizard --branch main --limit 6
```

Both `Checks` and `Deploy GitHub Pages` for the release commit must be
`completed success`.

Confirm hosted web serves the new version:

```sh
curl -L -s https://davstep.github.io/idle-wizard/ | rg "/idle-wizard/assets/index-.*\\.js"
node -e "(async()=>{const version=require('./package.json').version; const html=await (await fetch('https://davstep.github.io/idle-wizard/')).text(); const js=html.match(/src=\"([^\"]+\\.js)\"/)[1]; const text=await (await fetch(new URL(js,'https://davstep.github.io'))).text(); console.log(text.includes(version));})()"
```

If backend changed, verify Maincloud schema has the new reducers/tables:

```sh
PATH="$HOME/.local/bin:$PATH" spacetime describe \
  --json --server maincloud idle-wizard
```

Search the JSON output for the expected reducer or table names. For example:

```sh
PATH="$HOME/.local/bin:$PATH" spacetime describe \
  --json --server maincloud idle-wizard | rg "admin_kick_player_session"
```

Confirm the APK exists locally:

```sh
find android/app/build/outputs/apk -type f -name '*.apk' -print -exec ls -lh {} \;
```

Confirm Discord manually by checking the target channel for the changelog and APK
attachment or download-link post. The repo cannot prove Discord delivery after
the script exits.

## If Release Fails

- Before git push: fix the failure and rerun `npm run release`.
- After git push but before Discord: fix or rerun the failed GitHub Actions
  workflow first. Once both required workflows succeed, run
  `npm run discord:postApk -- path/to.apk`.
- After Pages failure: inspect the failed Actions run, fix, and push a new
  release commit.
- After backend publish failure: fix SpacetimeDB, then run
  `RELEASE_BACKEND=always npm run release` or manually run
  `npm run stdb:publish:maincloud` after verification.

## GitHub Release Fallback

`npm run release` attaches APKs up to 10 MiB directly to Discord. Larger APKs
are automatically uploaded to a versioned GitHub Release and the release script
posts that HTTPS download link to Discord. Override the threshold only when the
target channel supports a different limit:

```sh
DISCORD_APK_MAX_UPLOAD_BYTES=25000000 npm run release
```

For a recovery post after the changelog already succeeded, set
`DISCORD_APK_SKIP_CHANGELOG=1` and `DISCORD_FEATURE_SKIP=1`; the former also
prevents the existing current-version changelog from being posted twice.
