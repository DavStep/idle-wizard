---
title: Operational Risks
tags:
  - engineering
  - liveops
  - risk
status: active
world: engineering-liveops
---

# Operational Risks

## Save Migration

`normalizePlayerGameplaySave` drops unlisted save branches. Persistent save
shape changes need migration code or scripts before release.

## Active Clients

Before resetting SpacetimeDB player data, close or navigate away active clients.
Open clients can reconnect and republish old in-memory saves.

## Backend Config

Changing default task JSON or runtime config can rebalance existing players
after backend publish.

## Android

Capacitor builds copy Vite output into Android. Do not commit local SDK paths or
build output. Local Android backend testing needs reverse port access to
SpacetimeDB.

## Related

- [[Backend Authority]]
- [[Save And Sync]]
- [[Release Workflow]]
