---
title: Tutorial Source Map
tags:
  - tutorial
  - source
status: active
world: tutorial
---

# Tutorial Source Map

## Main Flow

- `TutorialStepManager.js` defines step IDs, groups, availability, completion,
  targets, reveal tokens, cue modes, and the exported source graph.
- `TutorialLogicManager.js` combines the active step, reminder timing, reveal
  state, target state, and lesson view state.
- `TutorialFacade.js` renders the returned view state and exposes dev cheat
  graph helpers.

## Specialist Managers

- `TutorialHintManager.js` renders Elara objective button, lesson panel, text,
  show-me action, target hint, and collision-aware placement.
- `TutorialTargetManager.js` resolves live `data-tutorial-id` targets and
  blockers.
- `TutorialRevealManager.js` applies reveal gates to the room surface.
- `TutorialReminderManager.js` handles idle timing and reminder visibility.
- `TutorialSaleManager.js` routes fast-sell and coin-shortfall tutorial state.
- `TutorialPointerSpineManager.js` owns the pointer cue asset.
- `TutorialGuideDragManager.js` owns dragging the Elara button.

## Related

- [[Tutorial Surface Rules]]
- [[Target And Reveal Rules]]
- [[QA And Capture]]
