# Sound Settings

Sound settings own device-local audio preferences for the app.

They are not gameplay state and are not synced to the player profile.
`sfxVolume` controls UI clicks and gameplay feedback cues such as Garden harvest
audio. `musicVolume` controls the quiet looping soundtrack through
`BackgroundMusicFacade`. Both values are stored from `0` through `1`; the
Settings sliders project them as `0` through `100`. Legacy boolean saves migrate
from off/on to `0`/`1`.
