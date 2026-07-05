---
title: Level 4 Gardening
tags:
  - tutorial
  - level
  - gardening
status: active
world: tutorial
---

# Level 4 Gardening

Lesson 4 introduces Garden through visible herb requirements. The lesson opens
immediately, but target pointer help waits for the idle window or explicit
`show me`.

| Code | Step | Kind | Page | Target | Cue |
|---|---|---|---|---|---|
| `t27` | `intro-garden` | dialog |  | `page:garden` |  |
| `t28` | `grow-sage` | objective |  |  | delayed target |
| `t29` | `first-harvest-complete` | prompt |  |  |  |
| `t30` | `fill-sage-herb-task` | objective |  |  | delayed target |
| `t31` | `fill-mint-herb-task` | objective |  |  | passive |
| `t32` | `level-up-four` | objective |  |  | passive |

## Design Notes

- The first sage grow lesson uses the live sage-herb requirement target.
- Later herb objectives use delayed target behavior and point only when the
  player appears stuck.
- Garden targets should sit on real actionable controls and visible plot labels.

## Related

- [[Target And Reveal Rules]]
- [[Level 5 Brewing]]
