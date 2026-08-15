# Garden Sounds

Garden audio owns the short planting and crop-collection cues for successful
manual plot actions. Each cue preloads its four source variants, avoids
immediate repeats, and plays the decoded source sample without pitch changes.
The checked-in WAVs are decoded from the source Wwise `seed-1` through `seed-4`
and `collect-1` through `collect-4` media in the Garden soundbank.

The audio is device feedback, not gameplay state. `SoundSettingsFacade`
enables or mutes both cues through the existing `sfx` preference. The Garden
presenter plays them only after the matching gameplay action succeeds; rejected
plot taps stay silent.
