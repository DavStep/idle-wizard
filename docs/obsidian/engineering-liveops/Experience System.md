---
title: Experience System
tags:
  - engineering
  - liveops
  - memory
status: active
world: engineering-liveops
---

# Experience System

`experience.md` is the repo-facing router for durable project lessons. It
points to the topic notes under `engineering-liveops/experience/`, which are
the authoritative place for traps, invariants, and safety rules that future
agents must read before changing code.

Obsidian is the human-facing memory layer. Keep it useful for project context,
decisions, maps, and open questions instead of mirroring every commit.

> [!important] Split Of Responsibility
> Put repeatable engineering lessons in [[Experience Index|experience notes]].
> Put human planning, product context, decision history, architecture maps, and
> unresolved questions in the broader Obsidian project notes.

## When To Update Obsidian

- A feature reaches a meaningful checkpoint.
- A product, balance, tutorial, backend, or release decision is made.
- An architecture boundary changes.
- A bug root cause changes how future work should be approached.
- An open question is created, answered, or made obsolete.

## When Not To Update Obsidian

- The change is only a routine code edit.
- The note would repeat a git diff, test output, or changelog entry.
- The lesson is only useful to agents and already belongs in a routed experience note.

## Related Memory

- [[Experience Index]]
- [[Operational Risks]]
- [[Runtime QA]]
- [[Save And Sync]]
- [[Architecture Boundaries]]
