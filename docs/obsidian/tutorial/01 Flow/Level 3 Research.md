---
title: Level 3 Research
tags:
  - tutorial
  - level
  - research
status: active
world: tutorial
---

# Level 3 Research

Lesson 3 introduces Research and the free mint seed unlock. Most level-3 steps
are passive: Elara stays quiet unless the player needs attention after idle time.

| Code | Step | Kind | Page | Target | Cue |
|---|---|---|---|---|---|
| `t21` | `intro-research` | dialog |  | `page:research` |  |
| `t22` | `research-mint-seed` | objective | `research` | `research:unlockSeed:mintSeed` | passive |
| `t23` | `first-research-complete` | prompt |  |  |  |
| `t24` | `fill-mint-seed-task` | objective |  |  | passive |
| `t25` | `fill-sage-seed-task` | objective |  |  | passive |
| `t26` | `level-up-three` | objective |  |  | passive |

## Note

`fill-sage-seed-task` is balance-dependent. The source note says default
`tasks.json` no longer includes a level-3 sage seed turn-in.

## Related

- [[Tutorial Risks]]
- [[Level 4 Gardening]]
