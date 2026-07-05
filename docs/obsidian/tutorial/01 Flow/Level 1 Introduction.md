---
title: Level 1 Introduction
tags:
  - tutorial
  - level
  - introduction
status: active
world: tutorial
---

# Level 1 Introduction

Lesson 1 introduces the workshop, mana, seed summoning, and level requirements.
Level 1 completes without coin.

| Code | Step | Kind | Page | Target | Cue |
|---|---|---|---|---|---|
| `t01` | `purchase-house` | dialog |  |  |  |
| `t02` | `intro-welcome` | prompt |  |  |  |
| `t03` | `intro-mana-sphere` | prompt | `workshop` | `top:mana` |  |
| `t04` | `first-summon-seed` | prompt | `workshop` | `workshop:summonSeed` | delay `2000ms` |
| `t05` | `summon-five-seeds` | objective | `workshop` |  |  |
| `t06` | `intro-level-requirements` | prompt | `workshop` |  |  |
| `t07` | `first-fill-seed-task` | prompt | `workshop` |  |  |
| `t08` | `finish-seed-task` | objective | `workshop` |  |  |
| `t09` | `first-task-complete` | prompt |  |  |  |
| `t10` | `level-up-one` | objective | `workshop` |  |  |

## Design Notes

- Only mana and summon stay revealed early.
- Elara explains task requirements before revealing the level requirement box.
- Target guidance must stay pointer-only and avoid stacking another guide box.

## Related

- [[Target And Reveal Rules]]
- [[Level 2 Market]]
