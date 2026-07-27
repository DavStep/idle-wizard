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
| `t09` | `intro-market` | dialog |  | `workshop:summonSeed` |  |
| `t10` | `prepare-seed-sale` | objective | `workshop` |  |  |
| `t11` | `open-market` | objective | `shop` | `page:shop` |  |
| `t12` | `select-market-stand` | objective | `shop` | `shop:stand:1` |  |
| `t13` | `select-sage-seed-sale` | objective | `shop` |  |  |
| `t14` | `earn-tutorial-coin` | objective |  |  | timed stall wait |
| `t15` | `first-sale-complete` | prompt |  | `page:workshop` |  |
| `t16` | `unselect-sage-seed-sale` | objective | `workshop` |  |  |

## Design Notes

- Elara points to the first stand, then `shop:sell:sageSeed`, then `shop:sell:percentage` for `25%`, then `shop:sell:mark`, and waits while the loaded stall sells.
- The sale is a normal level-2 request. Completing the final request advances the level automatically.

## Related

- [[Target And Reveal Rules]]
- [[Level 3 Research]]
