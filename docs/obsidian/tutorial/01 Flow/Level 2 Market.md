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

| Code | Step | Kind | Page | Target | Cue |
|---|---|---|---|---|---|
| `t11` | `intro-market` | dialog |  | `workshop:summonSeed` |  |
| `t12` | `prepare-seed-sale` | objective | `workshop` |  |  |
| `t13` | `open-market` | objective | `shop` | `page:shop` |  |
| `t14` | `select-market-stand` | objective | `shop` | `shop:stand:1` |  |
| `t15` | `select-sage-seed-sale` | objective | `shop` |  |  |
| `t16` | `earn-tutorial-coin` | objective |  |  | timed stall wait |
| `t17` | `first-sale-complete` | prompt |  | `page:workshop` |  |
| `t18` | `unselect-sage-seed-sale` | objective | `workshop` |  |  |
| `t19` | `level-up-two` | objective |  |  |  |

## Design Notes

- Elara points to the first stand, then `shop:sell:sageSeed`, then `shop:sell:percentage` for `25%`, then `shop:sell:mark`, and waits while the loaded stall sells.
- The sale is a normal level-2 request, not a prerequisite coin payment for level-up.

## Related

- [[Target And Reveal Rules]]
- [[Level 3 Research]]
