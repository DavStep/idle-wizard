# Android Live Updates

Idle Wizard Android builds use a free, self-hosted Capacitor live-update path.
The APK always contains a working production web bundle. Newer compatible web
bundles are published with GitHub Pages, downloaded in the background, and
queued with a five-minute background grace before activation. Brief app switches
therefore resume the current session instead of reloading the WebView.

## Player Flow

- Players must install version `0.3.49` or newer once to receive live updates.
- HTML, CSS, JavaScript, and bundled assets can update without another APK.
- A queued bundle activates only after the app has remained backgrounded for at
  least five minutes; short app switches do not apply it.
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

`latest.json` contains the SHA-256 archive checksum, supported platforms, and
minimum native version. The app accepts only HTTPS bundles under the trusted
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
Older APKs will keep running their last compatible bundle instead of applying
an unsafe update.
