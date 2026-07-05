---
title: Save And Sync
tags:
  - engineering
  - save
  - sync
status: active
world: engineering-liveops
---

# Save And Sync

Gameplay save stores full JSON under the connected identity. Clients load only
their own row through the authenticated view and write through the save reducer.

## Known Risk

The save is client-reported progress. Normalization caps values and clamps level
jumps, but it cannot prove earned inventory, research, timers, coin, or crystal
until those systems move behind server-authoritative reducers.

## Sync Guardrails

- Server profile rows should win on reconnect.
- Local defaults must not overwrite saved profile data.
- New persisted branches need migration, load, save, and normalization support.
- Data resets need maintenance gates and stale-client precautions.

## Related

- [[Backend Authority]]
- [[Operational Risks]]
