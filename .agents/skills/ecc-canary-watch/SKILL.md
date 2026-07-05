---
name: ecc-canary-watch
description: Use after Idle Wizard production/staging deploys, GitHub Pages updates, APK build/upload flows, dependency upgrades, backend publishes, or release candidates that need post-release smoke checks. Adapts ECC canary-watch for HTTP status, static asset health, console/network errors, SpacetimeDB connection, app gate state, and critical room visibility without mutating player data.
---

# ECC Canary Watch

## Purpose

Use this ECC-derived workflow to verify that a deployed or release-candidate build is alive after shipping. It is a smoke/canary checklist, not a replacement for focused tests, `npm run check`, Android build validation, or backend publish verification.

Default to read-only checks. Do not alter live player data, post production messages, reset accounts, dispatch reducers, or run destructive admin tooling unless the user explicitly asks for that scoped action.

## Watch Targets

- Web deploy or preview URL.
- Local release candidate at `http://127.0.0.1:55173/`.
- Android APK smoke path when the user asks for mobile validation.
- Backend publish health when SpacetimeDB changes shipped.

## Checks

1. HTTP and shell:
   - Page returns 2xx/3xx as expected.
   - No unexpected redirect loop.
   - App shell renders and is not blank.

2. Static assets:
   - Built JS/CSS assets return successful status and expected content type.
   - Public atlas, font, image, intro/tab art, and tutorial Spine URLs resolve under the correct `BASE_URL`.
   - No stale or oversized ignored QA asset is accidentally included in release output.

3. Runtime:
   - No critical console errors.
   - No unexpected failed network requests.
   - Online/account gates clear when backend is expected.
   - SpacetimeDB connection reaches the expected state for the target environment.

4. Critical visual smoke:
   - Workshop can become visible.
   - Top panel, bottom tabs, page name, and current room chrome are present.
   - No obvious scaling failure at the authored `1080x2170` surface and a fitted desktop viewport.

5. Release-specific checks:
   - For Android: confirm the intended build flavor and APK path; use `adb reverse tcp:3000 tcp:3000` only for local-backend dev builds.
   - For backend/config changes: confirm publish/generate/build steps requested by `docs/ai-workflow.md`.
   - For asset changes: verify real rendered asset, not only file existence.

## Report Shape

```markdown
Canary Watch
- Target:
- Build/deploy context:
- HTTP/assets:
- Runtime console/network:
- Backend gate/connection:
- Critical visual smoke:
- Verdict:
- Follow-ups:
```
