---
title: "Idle Wizard Obsidian Vault"
tags:
  - obsidian
  - project-map
status: active
---

# Idle Wizard Obsidian Vault

Open **`docs/obsidian`** as one vault. Start at [[Home.md|Vault Home]], then choose the view that matches the question.

## Three ways to read

1. **Whole game:** open [[Idle Wizard.canvas]] or Obsidian's global graph.
2. **One system:** open a curated system Canvas such as [[mechanics/garden/Garden And Herbs.canvas|Garden and Herbs]] or [[mechanics/market/Market.canvas|Market]].
3. **One fact:** open an entity note such as [[mechanics/garden/herbs/Sage Herb|Sage Herb]], then use its links or local graph.

Bases provide sortable lists. Individual notes provide detail. Relationship properties and wikilinks create the graph automatically.

## Knowledge layers

```text
Home → system hub → component or catalog → individual entity → source files
```

- **System hubs** explain the shape in plain language.
- **Canvases** show curated relationships without the global graph's noise.
- **Bases** list facts from atomic note properties.
- **Entity notes** hold one herb, seed, plot, potion, market type, or similar concept.
- **Source status notes** distinguish implemented behavior, defaults, live backend state, and known config drift.

## Renovated systems

- [[mechanics/garden/Garden And Herbs|Garden and Herbs]]
- [[mechanics/potions/Potion Recipes|Potion Recipes]]
- [[mechanics/Market Systems|Market Systems]]

## For AI changes

1. Open the relevant system hub and Canvas.
2. Follow entity and component links instead of searching long overview prose.
3. Read `source_files`, `value_scope`, `implementation`, and `verified_on`.
4. Verify runtime-configurable values before balance changes.
5. Update the smallest affected atomic notes and their relationships.

The folders remain one cross-linked graph:

- `gdd/` — player promise, rooms, interface, and journey.
- `balance/` — curves, currencies, capacities, and tuning.
- `mechanics/` — systems, components, and entities.
- `tutorial/` — FTUE flow and QA.
- `engineering-liveops/` — architecture, backend, release, and operational memory.
