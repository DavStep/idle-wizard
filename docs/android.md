# Android Build Setup

Android packaging uses Capacitor.

## Local Requirements

- Node 22+
- JDK 21
- Android SDK
- Android platform/build tools installed
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` pointing at the SDK

On this machine the SDK is at:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME="$HOME/.sdkman/candidates/java/21.0.11-tem"
```

## Commands

```sh
npm run mobile:sync
npm run android:assembleDebug
npm run android:run
npm run android:open
```

`mobile:sync` builds the Vite app, then copies `dist/` into the Android project.

The debug APK is produced under:

```txt
android/app/build/outputs/apk/debug/
```

## App Identity

Initial Android application id:

```txt
com.idlewizard.game
```

Change it later in `capacitor.config.json` and `android/app/build.gradle` if a final package namespace is needed.
