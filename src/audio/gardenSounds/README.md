# Garden Sounds

Garden audio owns the short planting cue for successful manual plot actions.
It preloads its four source variants, avoids immediate repeats, and plays the
decoded source sample without pitch changes. The checked-in WAVs are decoded
from the source Wwise `seed-1` through `seed-4` media in the Garden soundbank.
Successful harvest completions use the shared manual-summon pop from
`src/audio/uiClicks` when the herb reward starts flying instead of the Garden
collection bank.

The audio is device feedback, not gameplay state. `SoundSettingsFacade`
enables or mutes the cue through the existing `sfx` preference. The Garden
presenter plays it only after the matching gameplay action succeeds; rejected
plot taps stay silent.
