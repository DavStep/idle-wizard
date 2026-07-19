---
title: Core Loop
tags:
  - mechanics
  - loop
status: active
world: mechanics
---

# Core Loop

```text
mana -> seed summoning -> garden herbs -> brewing potions -> market coin -> tasks -> player level -> capacity and research -> stronger loops
```

The loop is intentionally circular: actions produce resources, resources satisfy
requirements or pay costs, and requirements unlock capacity and studies that
make future actions broader.

## Ownership

Gameplay owns rules through ECS-backed facades and managers. Pages render room
DOM from snapshots and call facade actions. Backend owns transport and
server-authoritative write paths where they exist.

## Related

- [[Guild System Plan]]
- [[Tasks And Leveling]]
- [[Production Systems]]
- [[Market Systems]]
