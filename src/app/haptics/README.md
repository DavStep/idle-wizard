# Haptics

Haptics owns small device vibrations for touch feedback. It is app interaction feedback, not gameplay state: preferences stay device-local, ECS stays untouched, and SpacetimeDB does not store haptic settings.

UI calls the facade with named events such as `playUiTap()`. The facade hides the Android constant-amplitude native bridge, Capacitor haptics fallback, browser vibration fallback, cooldowns, and the local enabled preference.

Every enabled touch control uses the shared press lifecycle: one mild pulse on
touch-down, no extra pulse for a quick release, and one mild release pulse
after a hold of at least `350ms`. Actions still activate only on a validated
release over the original control. Holding a button never activates or repeats
its action before release.
