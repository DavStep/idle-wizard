# Haptics

Haptics owns small device vibrations for touch feedback. It is app interaction feedback, not gameplay state: preferences stay device-local, ECS stays untouched, and SpacetimeDB does not store haptic settings.

UI calls the facade with named events such as `playUiTap()`. The facade hides the Android constant-amplitude native bridge, Capacitor haptics fallback, browser vibration fallback, cooldowns, and the local enabled preference.
