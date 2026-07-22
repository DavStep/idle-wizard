---
title: Target And Reveal Rules
tags:
  - tutorial
  - target
  - reveal
status: active
world: tutorial
---

# Target And Reveal Rules

## Targets

Put `data-tutorial-id` on the real actionable control, not on a parent row,
decorative wrapper, or price/value span.

Important target families:

- `top:mana`, `top:mana:value`, `top:mana:regen`
- `workshop:summonSeed`
- `workshop:tasks`, `workshop:tasksPin`
- `page:market`, `page:research`, `page:garden`, `page:brewing`
- `shop:stand:<number>`, `shop:sell:<itemKey>`, `shop:sell:percentage`, `shop:sell:mark`, `shop:sell:future`, `shop:sell:tab:<kind>`
- `research:unlockSeed:mintSeed`
- `research:unlockRecipe:manaTonic`
- Garden plot and seed label targets such as `garden:plot:1` and
  `garden:plot:1:label`

## Reveal Gates

Reveal tokens keep hidden room UI out of the way until the lesson needs it.
Active tutorial steps should preserve the current reveal gate when hidden behind
blocking dialogs.

## Placement

Tutorial UI must not cover the current target, needed CTA, relevant resources,
top status panel, bottom tabs, or Elara objective button.

## Blockers

New modal, gate, or announcement surfaces that should pause tutorial guidance
should set `data-tutorial-blocker="true"` on the visible root. Existing popup
class detection remains a fallback, but the marker is the durable contract for
new surfaces.

## Related

- [[Tutorial Surface Rules]]
- [[Tutorial Risks]]
