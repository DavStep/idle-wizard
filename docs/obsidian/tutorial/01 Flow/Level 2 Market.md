---
title: Level 2 Market
tags:
  - tutorial
  - level
  - market
status: active
world: tutorial
---

# Level 2 Market

Lesson 2 teaches the normal summon, timed-stall, and turn-in requirement order.
The flow uses live available quantities and loaded stall state, not tutorial-owned prices.
One starter NPC stand is unlocked from level 1 so the required first sale cannot
deadlock behind a level-4 slot unlock or a coin purchase.

| Code | Step | Kind | Page | Target | Cue |
|---|---|---|---|---|---|
| `t09` | `intro-market` | dialog |  | `workshop:summonSeed` |  |
| `t10` | `prepare-seed-sale` | objective | `workshop` |  |  |
| `t11` | `open-market` | objective | `shop` | `page:shop` |  |
| `t12` | `select-market-stand` | objective | `shop` | `shop:stand:1` |  |
| `t13` | `select-sage-seed-sale` | objective | `shop` |  |  |
| `t14` | `earn-tutorial-coin` | objective |  |  | timed stall wait |
| `t15` | `first-sale-complete` | prompt |  | `page:workshop` |  |
| `t16` | `unselect-sage-seed-sale` | objective | `workshop` |  |  |

## Design Notes

- If the Market remembers Gems or Players, Elara first points to Traders instead
  of pointing through the wrong panel.
- Elara points to the first stand, explicitly asks for `shop:sell:sageSeed`, then targets `shop:sell:percentage` until the exact allocation is `x1`, then points to `shop:sell:mark` and waits while the loaded stall sells.
- The sale is a normal level-2 request. Completing the final request advances the level automatically.

## Related

- [[Target And Reveal Rules]]
- [[Level 3 Research]]
