# Experience

This is the mandatory experience router. Read this file first, then read the routed domain files for the work you are about to touch.

Experience entries are durable project lessons: traps, invariants, support practices, and design constraints that would save future time or prevent player harm. They are not progress notes, commit summaries, or a second changelog.

## Always Read

- [Communication](docs/obsidian/engineering-liveops/experience/Communication.md) for collaboration rules, player-data caution, and cross-cutting safety lessons.

## Route By Work Type

- UI, layout, popups, page flow, tap behavior, animation, timer visuals, chat UI, world shells, mobile WebView interaction: read [Product Shape](docs/obsidian/engineering-liveops/experience/Product%20Shape.md) and [Style](docs/obsidian/engineering-liveops/experience/Style.md).
- Tutorial, FTUE, Elara guide boxes, objective panels, target hints, reveal gates, tutorial storage, tutorial QA: read [Product Shape](docs/obsidian/engineering-liveops/experience/Product%20Shape.md), [Style](docs/obsidian/engineering-liveops/experience/Style.md), and the tutorial-local docs/skills named in AGENTS.md.
- Gameplay rules, ECS boundaries, tasks, levels, production loops, currencies, inventory, progression, prestige, markets, world events, alliances, or rewards: read [Architecture](docs/obsidian/engineering-liveops/experience/Architecture.md) and [Gameplay Economy](docs/obsidian/engineering-liveops/experience/Gameplay%20Economy.md).
- Save/load, migrations, player data, account linking, profile sync, support fixes, resets, config rows, backend authority, SpacetimeDB reducers, generated bindings, subscriptions, or server-owned state: read [Backend And Android](docs/obsidian/engineering-liveops/experience/Backend%20And%20Android.md) and the relevant safety lessons in [Communication](docs/obsidian/engineering-liveops/experience/Communication.md).
- Release, deploy, local runtime, shared Vite/SpacetimeDB services, QA harnesses, GitHub Pages, APKs, Maincloud, or production operations: read [Development Operations](docs/obsidian/engineering-liveops/experience/Development%20Operations.md) and [Backend And Android](docs/obsidian/engineering-liveops/experience/Backend%20And%20Android.md).
- Architecture placement, facade/manager boundaries, ECS/render/backend separation, feature folders, or cross-feature ownership: read [Architecture](docs/obsidian/engineering-liveops/experience/Architecture.md).
- Styling decisions, A Dark Room proportions, border labels, typography, room chrome, scroll cues, icons, or color/resource presentation: read [Style](docs/obsidian/engineering-liveops/experience/Style.md) and [Product Shape](docs/obsidian/engineering-liveops/experience/Product%20Shape.md).
- Obsidian note upkeep or human-facing project memory: read [Experience Index](docs/obsidian/engineering-liveops/Experience%20Index.md) and [Experience System](docs/obsidian/engineering-liveops/Experience%20System.md), then update Obsidian only at meaningful checkpoints.

## All Domain Files

- [Communication](docs/obsidian/engineering-liveops/experience/Communication.md)
- [Product Shape](docs/obsidian/engineering-liveops/experience/Product%20Shape.md)
- [Architecture](docs/obsidian/engineering-liveops/experience/Architecture.md)
- [Gameplay Economy](docs/obsidian/engineering-liveops/experience/Gameplay%20Economy.md)
- [Style](docs/obsidian/engineering-liveops/experience/Style.md)
- [Development Operations](docs/obsidian/engineering-liveops/experience/Development%20Operations.md)
- [Backend And Android](docs/obsidian/engineering-liveops/experience/Backend%20And%20Android.md)

## Update Rules

- Add a lesson only when it is durable, specific, and likely to prevent repeated mistakes.
- Put the lesson in the most specific domain file. Do not duplicate it across files.
- If a new category appears, add one route here instead of making agents scan every file.
- Keep entries short and written as actionable constraints.
- Keep broader Obsidian planning notes human-facing. The routed experience notes remain the authoritative agent memory.
