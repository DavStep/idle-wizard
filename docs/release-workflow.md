# Release Workflow

Use this runbook for every player release. The release is complete only when the
APK is posted, `main` is pushed, GitHub Pages deploy succeeds, and any required
Maincloud backend publish is verified.

## Release Definition

- Player APK: Discord post with changelog and APK.
- Web client: GitHub Pages deploy from `main`.
- Backend: SpacetimeDB Maincloud publish when `spacetimedb/` changed.
- Formal GitHub Release/tag: optional, not part of `npm run release` today.

## Preflight

Start from `main` with a clean or intentionally staged worktree:

```sh
git status --short --branch
```

Check version and notes:

```sh
node -p "require('./package.json').version"
```

- Add `## <version>` to `PLAYER_CHANGELOG.md`.
- If the release has a large player-facing feature, add `## <version>` to
  `FEATURE_ANNOUNCEMENT.md`.
- Make sure `.env.local` has `DISCORD_APK_WEBHOOK_URL`.
- If a feature announcement exists, `.env.local` must also have
  `DISCORD_FEATURE_WEBHOOK_URL`.

If backend changes are already committed before the release command runs, force a
backend publish:

```sh
RELEASE_BACKEND=always npm run release
```

The default backend mode only publishes when `spacetimedb/` is dirty at release
time.

## Normal Release

Run:

```sh
npm run release
```

This performs:

1. `npm run lint`
2. `npm test`
3. production web build with `/idle-wizard/` base
4. production debug-signed Android APK build
5. optional SpacetimeDB Maincloud publish
6. git commit and push from `main`
7. Discord changelog, optional feature spotlight, and APK upload

Use explicit modes only when needed:

```sh
RELEASE_BACKEND=always npm run release
RELEASE_BACKEND=skip npm run release
RELEASE_APK=release npm run release
npm run release -- --apk path/to/file.apk
```

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
post. The repo cannot prove Discord delivery after the script exits.

## If Release Fails

- Before git push: fix the failure and rerun `npm run release`.
- After git push but before Discord: run `npm run discord:postApk -- path/to.apk`
  after fixing notes/webhooks.
- After Pages failure: inspect the failed Actions run, fix, and push a new
  release commit.
- After backend publish failure: fix SpacetimeDB, then run
  `RELEASE_BACKEND=always npm run release` or manually run
  `npm run stdb:publish:maincloud` after verification.

## Optional GitHub Release

`npm run release` does not create a tag or GitHub Release. If a formal release is
needed:

```sh
VERSION="$(node -p "require('./package.json').version")"
mkdir -p tmp
# Put only the current PLAYER_CHANGELOG.md version section in this file.
$EDITOR tmp/release-notes.md
git tag "v$VERSION"
git push origin "v$VERSION"
gh release create "v$VERSION" \
  android/app/build/outputs/apk/debug/app-debug.apk \
  --title "Idle Wizard $VERSION" \
  --notes-file tmp/release-notes.md
```

Only use this after the normal release verification passes.
