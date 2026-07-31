# Garden Harvest Sound

Garden harvest audio owns the short crop-cut cue for a successful manual plot
harvest. It preloads the five source variants, avoids immediate repeats, and
matches their original gain and randomized playback-rate treatment.

The audio is device feedback, not gameplay state. `SoundSettingsFacade`
enables or mutes it through the existing `sfx` preference, and the Garden
presenter plays it only after `startGardenHarvest` succeeds.
