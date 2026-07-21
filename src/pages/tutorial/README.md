# Tutorial

Elara Starbrew teaches through one lesson surface after the first purchase dialog. A small Elara button stays on the left side; pressing it opens the current lesson panel with copy, progress when the step has progress, and a `show me` action for target direction. Press-to-advance steps use the same lesson panel with a border action such as `next` or `continue`; room changes target the real bottom tab so players navigate themselves. Target cues are pointer-only and never add a second guide box. Major first-time concepts also get short checkpoint prompts after completion: first task, first sale, first harvest, first research, and first brew. Level 3 is mostly passive: Elara stays quiet, then shows an attention badge and glow only after idle time, except room-open beats and the first sage grow lesson can open the lesson panel directly before its pointer appears after a short idle pause.

Tutorial logic is unified through `TutorialLogicManager`. `TutorialStepManager` chooses and normalizes the current step, step definitions own reveal tokens and effects, `TutorialReminderManager` owns timing, and `TutorialLogicManager` returns the single view state the facade renders. Keep new tutorial flow rules in that path instead of branching directly inside `TutorialFacade`.

The guide covers the sequential main requests for a free level 1 seed task and level-up, level 2 summon/load/wait/turn-in play with normal trader-stand rules, level 3 Research and mint seed requests, level 4 Garden herb requests, and level 5 Brewing with mana tonic research. After the first summon, only mana and the summon button stay revealed until the fifth first-lesson sage seed. Then Elara explains that she gives one request at a time before her request box is revealed and pointed at the sage seed turn-in. It has no skip state.

The first Market sequence opens stand 1, points at `shop:sell:sageSeed`, and tells the player to hold it to load stock. Once matching stock is loaded, the objective becomes a passive wait for the five-second sale. There is no amount-selection or confirm beat.

Later coin guidance first reuses a loaded matching stall. Otherwise it reads `shop.shelf.sellItems`, opens an empty stall, selects the required category tab, and points to the item. If no available item exists, guide back to its source instead of a disabled loader row.

The target cue keeps the same diagonal placement math and uses the Spine pointer on a pointer-local Pixi canvas. Rotate the Spine shell by placement so the authored upward tap points at the target anchor.

Lesson 4 follows the active level 4 request, then sends players to Garden for the first sage grow using the live sage-herb target, so they see why the summon/plant loop matters. The lesson panel opens immediately, but target pointer help waits for the 2-second gardening idle window or an explicit `show me` press. Later herb objectives use the same delayed target pointer behavior, then point only when the player appears stuck.

Tutorial market steps use normal timed stands and `shop:stand:*` / `shop:sell:*` targets. Do not add FTUE-only coin grants, tutorial price overrides, or tutorial-owned inventory mutation; level 1 is free, and level 2 teaches systemic selling.

Players already past level 5 auto-complete the tutorial. Earlier snapshots that already show later progress skip stale lessons.

Dev builds with `VITE_ENABLE_CHEATS=true` expose tutorial step tooling through
`window.cheats`. Use `cheats.listTutorialStages()` or `cheats.getTutorialGraph()`
to inspect the current step graph, then `cheats.loadTutorialStep('t01')` or
`cheats.loadTutorialStep('intro-garden')` to reset local gameplay into the
matching tutorial/cutscene state for manual QA.
