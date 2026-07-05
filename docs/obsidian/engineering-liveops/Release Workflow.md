---
title: Release Workflow
tags:
  - engineering
  - release
  - qa
status: active
world: engineering-liveops
---

# Release Workflow

A player release is complete only when the APK is posted, `main` is pushed,
GitHub Pages deploy succeeds, and any required Maincloud backend publish is
verified.

## Normal Release Gate

`npm run release` performs version bump, notes preflight, lint, tests,
production web build, Android APK build, optional backend publish, git push, and
Discord posting.

## Verify

- Local git and remote `main` match.
- GitHub Actions checks and Pages deploy succeed.
- Hosted web serves the expected version.
- Maincloud schema has new reducers/tables when backend changed.
- Discord contains the changelog and APK.

## Related

- [[Runtime QA]]
- [[Operational Risks]]
