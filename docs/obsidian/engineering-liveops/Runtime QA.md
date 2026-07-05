---
title: Runtime QA
tags:
  - engineering
  - qa
  - runtime
status: active
world: engineering-liveops
---

# Runtime QA

Live browser or Android QA must use the shared local runtime from the primary
worktree.

## Local Services

- Vite dev server: `http://127.0.0.1:55173/`
- SpacetimeDB: `http://127.0.0.1:3000`

Check Vite with `npm run dev:status`. Check SpacetimeDB with
`lsof -nP -sTCP:LISTEN -iTCP:3000`.

## Verification Ladder

- Focused logic change: matching test file.
- Shared gameplay/page/backend/persistence/release change: `npm run check`.
- UI/layout/tutorial change: focused tests plus screenshot/click QA.
- Backend schema/config change: publish locally and regenerate bindings.

## Related

- [[Release Workflow]]
- [[Architecture Boundaries]]
