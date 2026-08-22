# Tutorial

Elara Starbrew teaches through one optional lesson surface after the first purchase dialog. A small Elara button stays on the left side; pressing it opens the current lesson panel with copy, progress when the step has progress, and a `show me` action for target direction. Objective and progress labels display in Title Case while narrative copy keeps its authored sentence case. Quantity progress keeps its count fixed on the right of the rail in the same row. The panel measures the final copy and optional progress row before the typewriter reveal, so its height follows its content. Tutorial state never hides or disables gameplay controls, consumes unrelated presses, activates a target, or changes rooms for the player. Press-to-advance steps use the same lesson panel with a yellow action such as `Next` or `Continue` fully inside the lower-right corner; every advance label starts with a capital letter, and the progress rail remains immediately beside the action. Room changes target the real bottom tab so players navigate themselves. Target cues are pointer-only and never add a second guide box. Major first-time concepts also get short checkpoint prompts after completion: first task, first sale, first harvest, first research, and first brew. Level 3 is mostly passive: Elara stays quiet, then shows an attention badge and glow only after idle time, except room-open beats and the first sage grow lesson can open the lesson panel directly before its pointer appears after a short idle pause.

Tutorial logic is unified through `TutorialLogicManager`. `TutorialStepManager` chooses and normalizes the current step, step definitions own reveal tokens and effects, `TutorialReminderManager` owns timing, and `TutorialLogicManager` returns the single view state the facade renders. Keep new tutorial flow rules in that path instead of branching directly inside `TutorialFacade`.

Persisted Elara drag placement is a preference, not permission to cover the current action. When the open lesson or Elara button intersects the live tutorial target or another protected control, retained placement resolves to the nearest clear slot before input is registered. Object-shaped step progress uses its `value / max` ratio so the rail and its label always describe the same state.

The guide covers the sequential main requests for a free level 1 seed task with automatic level-up, level 2 summon/load/wait/turn-in play with normal trader-stand rules, level 3 Research and mint seed requests, level 4 Garden herb requests, and level 5 Brewing with mana tonic research. Early steps focus Elara's copy and pointer on mana, summoning, and the first request while the rest of the room remains fully available. It has no skip state.

Lesson 5 prepares and refills mana tonic through the live retained Brewing controls: `Recipes`, Mana Tonic in the recipe book, then the primary Brew action. When the refill reaches `3/3 Sage`, the objective and pointer switch from filling/Recipes to `Brew Mana Tonic Again` and the live Brew action. The live HUD controls own those tutorial IDs; hidden legacy Brewing controls are not tutorial targets.

The first Market sequence guides the visible `Traders` tab first when another Market tab is selected, then opens stand 1 and explicitly asks the player to select the `shop:sell:sageSeed` row before the allocation control becomes the lesson target. It then demonstrates the exact-count gesture from the live knob to `x1`: appear on the knob, press and hold, drag to one seed, release, hide, and repeat after a two-second pause. Once one of the five lesson seeds is selected, it points at `shop:sell:mark`. Once matching stock is loaded, the objective becomes a passive wait for the five-second sale.

The target cue keeps the same diagonal placement math and uses the Spine pointer on a pointer-local Pixi canvas. Rotate the Spine shell by placement so the authored upward tap points at the target anchor.

Lesson 4 follows the active level 4 request, then sends players to Garden for the first sage grow using the live sage-herb target, so they see why the summon/plant loop matters. The lesson panel opens immediately, but target pointer help waits for the 2-second gardening idle window or an explicit `show me` press. Later herb objectives use the same delayed target pointer behavior, then point only when the player appears stuck.

Tutorial market steps use normal timed stands and `shop:stand:*` / `shop:sell:*` targets. Do not add FTUE-only coin grants, tutorial price overrides, or tutorial-owned inventory mutation. Level 2 teaches systemic selling as a task, while every level-up remains coin-free.

Players already past level 5 auto-complete the tutorial. Earlier snapshots that already show later progress skip stale lessons.

Dev builds with `VITE_ENABLE_CHEATS=true` expose tutorial step tooling through
`window.cheats`. Use `cheats.listTutorialStages()` or `cheats.getTutorialGraph()`
to inspect the current step graph, then `cheats.loadTutorialStep('t01')` or
`cheats.loadTutorialStep('intro-garden')` to reset local gameplay into the
matching tutorial/cutscene state for manual QA.
