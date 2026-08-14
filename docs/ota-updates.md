# Android Live Updates

Idle Wizard Android builds use a free, self-hosted Capacitor live-update path.
The APK always contains a working production web bundle. Newer compatible web
bundles are published with GitHub Pages, downloaded in the background, and
activated the next time the app backgrounds or restarts.

## Player Flow

- Players must install version `0.3.49` or newer once to receive live updates.
- HTML, CSS, JavaScript, and bundled assets can update without another APK.
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
The release APK is still required whenever native code changes.

## Native Compatibility

`ota.config.json` owns `minimumNativeVersion`. Keep it at the first APK that can
run the current web bundle. Raise it to the new package version in the same
release whenever a web bundle starts depending on new native code or config.
Older APKs will keep running their last compatible bundle instead of applying
an unsafe update.
