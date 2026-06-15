# Tutorial

Mira introduces the first loop with a few press-to-advance prompts, then stays as a small objective button with progress behind it. Target hints still point at real controls, hide during waits, and reappear only after inactivity.

The guide covers level 1 seed task, tutorial market sale, level 1 level-up, level 2 Garden sage, level 3 seed research, and level 4 Brewing recipe research. It has no skip state.

The level 1 market lesson is the only tutorial-only gameplay effect: after the player selects sage seed on the NPC stand, the tutorial locally sells one sage seed for fixed tutorial gold. It updates real local inventory/gold and save data, but it does not call the NPC market backend or change normal market pricing/demand.

Players already past level 4 auto-complete the tutorial. Earlier snapshots that already show later progress skip stale lessons.
