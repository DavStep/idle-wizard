# Shared UI Sounds

The UI sound facade owns the shared button, purchase, and dialog-opening cues.

The retained input router and DOM press manager play Root Run's exact `button-click` sample once for confirmed actionable presses. Successful positive-cost purchases play Root Run's two-variant `sell` bank at the station-upgrade mix, while newly activated retained dialogs play the four-variant `ui-fly` bank. Dialog close controls use the same button-click cue as Root Run. The device-local `sfx` preference gates all three cues.
