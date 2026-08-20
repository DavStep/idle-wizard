# Android Live Updates

Idle Wizard Android builds use a free, self-hosted Capacitor live-update path.
The APK always contains a working production web bundle. Newer compatible web
bundles are published with GitHub Pages. Before authentication or backend
connection begins, the app checks for a compatible update and opens a mandatory
in-game prompt when one is available. The player starts the download explicitly,
sees real downloaded and total megabytes on the loading splash, and the app
safely restarts into the finished bundle before continuing to account login.

## Player Flow

- Players must install version `0.3.49` or newer once to receive live updates.
- Startup checks the native and live-bundle versions before preparing auth. An
  incompatible native APK remains blocked with instructions to install the
  minimum supported APK and reopen the game.
- HTML, CSS, JavaScript, and bundled assets can update without another APK.
- The update prompt has no close action. `Update Game` switches to the loading
  splash and reports native download progress as downloaded MB / total MB.
- A failed download remains blocking and offers `Retry Update`.
- Before activation, the app saves and flushes current progress when gameplay is
  already active. A startup update runs before any account save is hydrated and
  therefore activates directly. The native updater's immediate `set` operation
  restarts the JavaScript context into the downloaded bundle.
- Brief app switches never queue or activate a live update.
- Android/Capacitor native code, permissions, plugins, and configuration still
  require a newly signed APK.
- A bundle that fails to start before `notifyAppReady()` is automatically rolled
  back. Failed versions stay recorded locally so the app does not retry them.

## Release Flow

The GitHub Pages workflow builds the website with `/idle-wizard/` as its base,
then makes a separate Capacitor-compatible build with `/` as its base. The
second build is zipped and published as:

```txt
/ota/latest.json
/ota/bundles/idle-wizard-<version>.zip
```

`latest.json` contains the SHA-256 archive checksum, archive byte size,
supported platforms, and minimum native version. The app accepts only HTTPS bundles under the trusted
`/idle-wizard/ota/bundles/` path.

Run the bundle preparation locally after a production OTA build with:

```sh
npm run build:ota
npm run build -- --base=/idle-wizard/
npm run ota:bundle
```

The ordinary `npm run release` flow remains the source of package versions,
player notes, checks, signed APKs, GitHub Pages deployment, and Discord delivery.
After Pages succeeds, that command downloads and checksum-verifies the exact
published manifest and bundle before posting the APK to Discord. The release APK
is still required whenever native code changes.

The app calls `notifyAppReady()` immediately when startup begins, before the
renderer's asset preload. Keep this call ahead of network or heavy initialization
so slow devices cannot hit the native rollback deadline before marking a good
bundle healthy.

## Native Compatibility

`ota.config.json` owns `minimumNativeVersion`. Keep it at the first APK that can
run the current web bundle. Raise it to the new package version in the same
release whenever a web bundle starts depending on new native code or config.
Older APKs never apply an unsafe bundle. They remain at the update gate until a
compatible APK is installed.
