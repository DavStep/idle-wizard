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

Lesson 2 teaches the normal summon, fast-sell, and turn-in requirement order.
The flow uses live fast-sell quantity and quote state, not tutorial-owned prices.

| Code | Step | Kind | Page | Target | Cue |
|---|---|---|---|---|---|
| `t11` | `intro-market` | dialog |  | `workshop:summonSeed` |  |
| `t12` | `prepare-seed-sale` | objective | `workshop` |  |  |
| `t13` | `open-market` | objective | `shop` | `shop:directSell` |  |
| `t14` | `select-market-stand` | objective | `shop` | `shop:directSell` |  |
| `t15` | `select-sage-seed-sale` | objective | `shop` |  |  |
| `t16` | `show-selected-sale-amount` | objective | `shop` | `shop:directSell:amount` | focus target, auto `2000ms` |
| `t17` | `earn-tutorial-coin` | objective |  |  |  |
| `t18` | `first-sale-complete` | prompt |  | `page:workshop` |  |
| `t19` | `unselect-sage-seed-sale` | objective | `workshop` |  |  |
| `t20` | `level-up-two` | objective |  |  |  |

## Design Notes

- The amount beat boinks the selected amount for two seconds without opening the
  lesson panel or showing a pointer.
- Later coin-shortfall guidance points at `sell` or `+1` based on the current
  selected amount and missing coin.
- If the matching fast-sell row would show `x0`, Elara routes back to a source
  action instead of a disabled row.

## Related

- [[Coin Shortfall Branch]]
- [[Target And Reveal Rules]]
- [[Level 3 Research]]
