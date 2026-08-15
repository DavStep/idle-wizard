# Shared UI Sounds

The UI sound facade owns the shared button, purchase, and dialog-opening cues.

The retained input router and DOM press manager play Idle Outpost's three-variant `button-touch-up` bank once for confirmed actionable presses. The samples are decoded from the checked-in Mac `main.bnk` source bank; the interaction remains release-confirmed, so this does not add a separate press-down cue. Successful positive-cost purchases play Root Run's two-variant `sell` bank at the station-upgrade mix, while newly activated retained dialogs play the four-variant `ui-fly` bank. Dialog close controls use the same shared button-release cue. The device-local `sfx` preference gates all three cues.
