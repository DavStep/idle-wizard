---
title: Coin Shortfall Branch
tags:
  - tutorial
  - market
  - branch
status: active
world: tutorial
---

# Coin Shortfall Branch

Level-up steps can route through Market when the player is short on coin.

## Routing Logic

```mermaid
flowchart TD
  A["coin shortfall"] --> B{"available fast-sell quantity?"}
  B -->|"no"| C["obtain source: sage or mint"]
  B -->|"yes"| D{"on Market page?"}
  D -->|"no"| E["open Market"]
  D -->|"yes"| F{"fast sell open?"}
  F -->|"no"| G["open fast sell"]
  F -->|"yes"| H{"item selected and quantity > 0?"}
  H -->|"yes"| I["target sell if enough, otherwise +1"]
  H -->|"no"| J{"matching tab open?"}
  J -->|"no"| K["open seeds/herbs/potions tab"]
  J -->|"yes"| L["choose first item with quantity > 0"]
```

## Guardrail

Coin guidance reads Market `shop.shelf.sellItems` quantities. Raw inventory may
include items reserved by Garden, Brewing, or listings, so it can point at items
that fast sell correctly shows as unavailable.

## Related

- [[Level 2 Market]]
- [[Tutorial Risks]]
