# Prestige

Prestige records completed level milestones and resets the run. Completed milestones are permanent prestige data. Ruby current is derived from those completed milestones at run start, not treated as permanent currency by itself. Emerald current is preserved across prestige resets. Personal task daily and weekly progress is also preserved and only rolls on its normal period timer. A new prestige run starts at half the completed prestige milestone level, with level 10 resetting to paid player level 5. The new run also starts with the same level-up crystal total the player would have earned by naturally reaching that reset level.

Milestones are every 10 levels. The default reward is `1 ruby`, with `level 50 = 2 ruby` and `level 100 = 5 ruby`.

Claiming a milestone also credits every lower unclaimed milestone through the claimed level. A run reset still uses the claimed milestone level, while ruby, prestige point count, next-run previews, and world-chat prestige count use the full credited milestone set. Save normalization fills old prestige gaps such as `[20]` into `[10, 20]`; spent ruby is not refilled, only missing unspent earned ruby is restored.

Completed prestige count unlocks the first reward lane directly: Prestige 1 opens advanced capacity studies, Prestige 2 adds a second timed research slot, Prestige 3 enables the UI-only run focus selector, Prestige 4 enables improved auto summon reserve controls, and Prestige 5 unlocks stronger room study levels 6-10.
