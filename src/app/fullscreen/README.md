# Fullscreen

`FullscreenFacade` owns the browser fullscreen state used by Settings. The
option is exposed only in a supported mobile web browser. Capacitor builds and
installed standalone web apps do not show it because they already own their
display surface.

The setting reflects the current browser state rather than a persisted default.
Browsers require a live user gesture for `requestFullscreen()`, so re-entering
fullscreen automatically during startup is intentionally not attempted.

