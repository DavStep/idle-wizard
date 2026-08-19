# Shared UI Sounds

The UI sound facade owns the shared button, purchase, dialog-opening, and
manual seed-summon cues.

The retained input router and DOM press manager play Idle Outpost's second `button-touch-up` sample once for confirmed actionable presses. The sample is decoded from the checked-in Mac `main.bnk` source bank; the interaction remains release-confirmed, so this does not add a separate press-down cue. Successful positive-cost purchases play Root Run's two-variant `sell` bank at the station-upgrade mix, while newly activated retained dialogs play the four-variant `ui-fly` bank. Dialog close controls use the same shared button-release cue. The device-local `sfx` preference gates all cues.

Successful manual seed summons play the checked-in short pop once per seed in
the summon result, spaced into a tight burst with slight pitch variation. The
same single pop confirms successful manual Garden harvests and potion
collections. Rejected actions and background automation stay silent. Summon
bursts are capped at the supported five-seed summon multiplier.

Mobile audio unlock is gesture-owned. Sound requests made while Web Audio is
suspended are discarded, so startup dialogs and other pre-touch activity cannot
replay as a burst after the first pointer gesture unlocks the context.
