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
`show me`. Garden introduction availability depends on reaching level 4, not on
already owning a sage seed, because the preceding Research request can consume
the player's last seed.

| Code | Step | Kind | Page | Target | Cue |
|---|---|---|---|---|---|
| `t22` | `intro-garden` | dialog |  | `page:garden` |  |
| `t23` | `grow-sage` | objective |  |  | delayed target |
| `t24` | `first-harvest-complete` | prompt |  |  |  |
| `t25` | `fill-mint-herb-task` | objective |  |  | passive |
| `t26` | `fill-sage-herb-task` | objective |  |  | delayed target |

## Design Notes

- The first sage grow lesson uses the live sage-herb requirement target.
- The mint grow objective comes before the combined final turn-in objective so
  Elara follows the same active-request order the player sees.
- The final herb objective dynamically follows the active sage or mint turn-in
  and remains until the level advances.
- Garden targets should sit on real actionable controls and visible plot labels.

## Related

- [[Target And Reveal Rules]]
- [[Level 5 Brewing]]
