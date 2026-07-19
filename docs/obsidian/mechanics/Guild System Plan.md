---
title: Guild System Plan
tags:
  - mechanics
  - guild
  - social
  - multiplayer
  - proposal
status: proposed
world: mechanics
aliases:
  - Guild Redesign
  - Guilds V2
---

# Guild System Plan

> [!abstract] Proposal
> This note describes a proposed Guild redesign. It is not the current
> implementation. See [[Guilds]] for the shipped behavior and current technical
> boundaries.

## Recommendation

Rebuild the Guild as the field arm of the wizard's existing production loop.
The wizard creates supplies, earns coin, completes research, and responds to
weekly world events. Adventurers consume those supplies and coin to act in that
same world, then return character growth, world contribution, and rewards to the
main game.

The Guild remains one player's company of NPC adventurers. It is not a
player-created group and must remain separate from the [[Events And Social#Trade Alliance|Trade Alliance]].

## Problem With The Current Shape

The current Guild is intentionally a parallel progression track. Its existing
connections are too shallow for the requested competitive and living-world
role.

| Current connection | Current effect | Missing consequence |
| --- | --- | --- |
| Player level | Changes applicant range | Guild activity does not advance normal requirements |
| Coin | Pays for the charter and secretary | Hiring is free and adventurer growth is not a meaningful coin sink |
| Weekly world event | Changes some request themes | Guild completion does not contribute to the real event |
| Quest rewards | Return coin, seeds, or herbs | Guild consumes none of the wizard's production |
| Prestige save | Preserves Guild JSON | The level-15 gate hides the preserved Guild after reset |

The redesign must close this loop instead of adding more independent Guild
currencies, timers, upgrade trees, and reward catalogs.

## Product Role

The Guild should answer three questions for the player:

1. Why should I keep producing potions after learning their recipes?
2. What effect does my wizard have on the wider world?
3. Which adventurer from my Guild has become known by other players?

The wizard is the producer and planner. Adventurers are the people who carry
that preparation into the world.

## Connection To The Core Game

```text
mana -> summon seeds -> grow herbs -> brew potions
                                      |-> sell -> coin
                                      |-> provision a commission

coin -> charter -> hire -> train -> improve the hall

provisioned commission
  -> adventurer xp and relationships
  -> seasonal renown
  -> weekly world-event contribution
  -> coin and normal-game progress

player level + research + prestige
  -> new recipes, applicants, commission tiers, staff tiers, and regions
```

### Integration Matrix

| Existing system | Guild input | Guild output |
| --- | --- | --- |
| [[Production Systems\|Production]] | Explicitly supplied potions | A durable use for brewed inventory |
| [[Market Systems\|Market and coin]] | Charter, hiring, training, facilities, staff searches | Coin rewards and optional future market demand |
| [[Tasks And Leveling\|Tasks and level]] | Level gates applicant and commission tiers | Selected post-level-15 requirements can observe Guild actions |
| [[Research And Unlocks\|Research]] | Existing studies unlock Guild rules | No separate Guild research screen or research currency |
| [[Prestige]] | Completed prestiges unlock permanent Guild tiers | Guild, staff, adventurers, and history persist through reset |
| [[Events And Social#Weekly World Events\|Weekly world events]] | Event supplies commissions and context | Commission outcomes add contribution to the same event |
| Player profile | Server owner identity | Adventurer profiles lead to the Guild Master profile |

> [!important] No Silent Consumption
> A Guild action may consume inventory only after the player explicitly places
> an item into a commission or facility. Timers and staff may never drain the
> player's bag in the background.

## Design Principles

- Every repeatable Guild action consumes or changes something from the main
  game, or returns a result to the main game.
- Keep adventurers autonomous enough to feel alive. The player prepares
  opportunities and supplies instead of directly puppeteering every action.
- Use coin for understandable choices: recruit, train, improve, and search for
  staff.
- Rank achievement, not spending. Purchased power can help an adventurer
  attempt harder work, but it must not directly grant leaderboard score.
- Use existing tasks, research, prestige, events, currencies, and profiles
  before creating another Guild-only system.
- Keep private condition data private. Publish only the fields required for
  profiles, Guild identity, and fair competition.
- Shared or ranked state must be server-authoritative.

## Non-Goals

- No equipment or separate adventurer inventory in the first release.
- No real-time PvP or direct attacks on another player's Guild.
- No Guild-only premium currency.
- No second daily task board.
- No separate Guild research room.
- No passive social action that produces competitive XP or renown.
- No random seed or herb rewards that bypass the production chain.
- No replacement for Trade Alliances, alliance chat, or alliance quests.

## Core Player Loop

1. Review commissions derived from the current world event, player level, and
   unlocked regions.
2. Post a commission that matches the Guild's roster.
3. Place optional provisions from the player's real potion inventory.
4. Eligible adventurers decide whether to take it based on fit, personality,
   morale, fatigue, relationships, and risk tolerance.
5. The server records the adventurer, provisions, staff effects, stats, risk,
   and completion time at departure.
6. The server resolves the commission when due.
7. The adventurer gains action-appropriate XP, condition changes, relationship
   events, deeds, and possibly seasonal renown.
8. The player receives world-event contribution, coin, and any configured task
   progress.
9. The result appears in the Hall chronicle and the adventurer's career history.

## Commissions And Provisions

Guild requests should become commissions tied to the same world the wizard is
already affecting.

Each commission needs:

- Stable server ID and world-event ID when applicable
- Title, situation, region, difficulty, duration, and expiry
- One or two relevant adventurer stats
- Public risk category and visible possible outcomes
- Zero or more provision slots
- Coin reward and world-event contribution range
- Renown rules based on difficulty and result
- A record of the adventurer, staff, research, and provisions captured at start

The default commission pool should prefer the active weekly event. Normal
commissions can fill remaining slots when the event does not provide enough
variety.

### Potion Provisions

Exact values belong in balance configuration. The first design pass should use
clear, bounded effects rather than universal percentage bonuses.

| Potion family | Proposed commission use |
| --- | --- |
| Healing and salves | Reduce injury severity or hospital duration |
| Antidotes and purges | Counter poison, disease, or tainted-water risks |
| Vigor and stamina | Reduce fatigue or improve endurance checks |
| Calming and sleep | Protect morale and improve recovery |
| Courage | Improve willingness to accept dangerous work |
| Wards and veils | Counter matching magical or stealth threats |
| Focus and sight | Improve planning, wisdom, or discovery checks |

Provisions are consumed when the commission starts. Canceling before departure
returns them. Canceling after departure is not allowed unless a future recall
rule explicitly defines its cost and outcome.

## Recruitment And Adventurer Careers

### Recruitment

Adventurers should be hired directly for coin. Adventurer recruitment is not
gacha.

Every offer should show:

- Name, icon, starting level, and current power
- Stat tendencies and personality
- Potential band
- Starting trait or career hook
- Hiring cost
- Offer expiry

Higher-level and higher-potential candidates cost more. The recruiter and Guild
research may improve offer quality or reveal more information, but the player
still chooses the person being hired.

### Career Progression

Adventurers gain XP from what they actually do:

- Commissions provide the main XP source.
- Difficult and underdog successes provide bonus XP and renown.
- Paid training provides smaller, reliable XP and selected stat development.
- Sparring develops physical skills and rivalries.
- Study develops wisdom, cunning, or discipline.
- Mentoring develops a junior adventurer and the mentor relationship.
- Rest, tavern time, and ordinary conversation change condition and
  relationships, not competitive XP.

Commission type should influence stat growth. A combat career should not grow
identically to an arcane, diplomatic, or exploration career.

### Power And Renown

- `power` is a stable summary of permanent adventurer capability.
- `seasonal renown` measures server-resolved achievement during the current
  competitive season.
- Power is displayed on profiles but is not the primary leaderboard score.
- Renown comes from difficulty-adjusted outcomes, world-event work, first
  clears, and notable deeds.
- Repeating the same easy commission should have diminishing renown returns.

### Injury, Death, And Retirement

Ordinary failure should produce fatigue, morale loss, injury, or hospital time.
Permanent death or forced retirement should only be possible on a clearly
marked deadly commission that the player explicitly accepts.

Dead or retired adventurers remain in the Guild memorial and public career
history. They do not occupy an active roster slot.

## Living Guild

The Hall should feel alive because adventurers react to real state, not because
it generates unrelated flavor text every few minutes.

### Relationship Model

Use a bounded relationship graph. Each adventurer keeps only a small number of
meaningful edges:

- Friend
- Rival
- Mentor
- Protege
- Trusted partner

Relationship changes can come from:

- Sharing or competing for commissions
- Sparring and training
- Celebrating success
- Blaming or supporting someone after failure
- Visiting an injured companion
- Mentoring
- Being selected repeatedly while another adventurer is overlooked

Do not simulate every possible pair on every tick. Resolve scheduled activities
and emit only meaningful changes.

### Hall Chronicle

The chronicle should summarize:

- Departures and returns
- Level-ups and specializations
- Important relationship changes
- Staff arrivals and promotions
- Injuries, recovery, retirement, and death
- World-event deeds and leaderboard milestones

Routine rest and repeated idle actions should be aggregated instead of filling
the log.

## Guild Progression And Facilities

Guild reputation and level come from completed commissions and adventurer
milestones. Guild level unlocks capacity and rules, but should not directly add
competitive score.

| Facility | Owns | Main-game connection |
| --- | --- | --- |
| Hall | Roster and staff capacity | Coin upgrade and persistent Guild identity |
| Request board | Commission visibility and provision slots | Weekly world event and unlocked regions |
| Infirmary | Recovery capacity | Healing potions and healer staff |
| Tavern | Morale and social activity | Coin-funded celebrations and calming supplies |
| Training yard | Training and mentoring capacity | Coin and relevant potion support |
| Recruitment desk | Offer count and information | Player level, prestige, recruiter staff, and coin |

Keep facility levels shallow. Facilities establish capacity, staff improve how a
facility operates, and research unlocks new rules. These systems should not all
repeat the same flat bonus.

The current secretary should migrate into a guaranteed starter `steward` staff
member. Existing secretary level can establish the migrated Hall and request
board baseline.

## Staff Gacha

Staff is the player-facing term. Software managers remain an implementation
concept.

### Staff Search Rules

- A normal staff search spends coin.
- World-event or prestige rewards may grant a free search, but there is no new
  Guild currency.
- Odds and the complete pool are visible before searching.
- The server owns random rolls, pity, spending, duplicate handling, and audit
  history.
- Hard pity guarantees a high-tier result after a configured number of searches.
- A duplicate adds promotion progress to that same staff member.
- Staff ranks are capped and use diminishing returns.
- Staff never multiplies renown directly.
- The reveal is a restrained text result, not a casino animation.

### Staff Roles

| Staff | Connected effect |
| --- | --- |
| Steward | Hall capacity, organization, and starter guidance |
| Healer | Improves supplied healing items and hospital recovery |
| Innkeeper | Improves morale recovery and positive social activity |
| Trainer | Improves coin-funded training and mentoring |
| Recruiter | Improves candidate quality, information, or offer count |
| Quartermaster | Improves provision capacity or bounded supply efficiency |
| Scholar | Unlocks or improves Guild studies in the existing Research room |

## Guild Research

Guild studies should appear in the existing [[Research And Unlocks|Research]]
room. They may be grouped as Guild studies, but they must use the existing
research lifecycle and currencies instead of Guild Research Points.

Prefer rule unlocks:

- `field medicine`: unlock a second recovery treatment
- `contract appraisal`: reveal more risk and outcome information
- `mentorship`: allow a senior adventurer to train a junior
- `expedition planning`: unlock another provision slot
- `triage`: let the healer prioritize one hospitalized adventurer
- `patron network`: improve commission variety in unlocked regions
- `team practice`: unlock party commissions in a later phase

Exact currencies, prices, prerequisites, and timer lengths remain balance
decisions. Follow existing research category rules and do not repurpose ruby,
which currently belongs to automation, without a separate approved economy
change.

## Tasks And Normal Progression

Once the Guild is proven stable, selected post-level-15 requirements can observe
normal Guild actions:

- Provision a commission
- Complete a commission
- Train an adventurer
- Complete a world-event commission

These requirements should use the same gameplay event pipeline as summon,
grow, brew, sell, and research. Do not create another Guild task board.

Do not require a newly unlocked potion and a new Guild action in the same level
row. Keep the existing task sawtooth and research-order rules.

## World Events And Competition

Weekly world events provide the shared context. A single event can ask the
wizard to produce supplies while offering adventurer commissions that address
the same situation.

Example for `fever in the lower quarter`:

1. The event asks the wizard to grow medicinal herbs and brew healing potions.
2. The Guild receives `escort the town healer` and `trace the tainted water`.
3. The player provisions a healing potion or antidote.
4. An adventurer takes the commission and the server resolves it.
5. The same event gains contribution points.
6. The adventurer records the deed and may gain seasonal renown.

Adventurer contribution and production contribution should both feed the same
world event, but they should remain separately visible for balance and
analytics.

## Public Profiles And Leaderboards

### Leaderboard

The primary Adventurer leaderboard ranks seasonal renown. It should support an
all-time career view as a secondary showcase.

Example row:

```text
7. Mira the Quiet | [ASH] Ash Hall | 1,840 renown
```

The row contains:

- Rank
- Adventurer name
- Guild tag and Guild name
- Level or power where space permits
- Seasonal renown

### Adventurer Profile

Pressing the row opens a public adventurer profile with:

- Name, icon, level, power, and current rank
- Personality and public traits
- Public status such as resting, training, on commission, or hospitalized
- Current-season summary
- Career totals and notable deeds
- Guild tag and Guild name
- Guild Master display name

The Guild Master name is a real action keyed by server identity. Pressing it
opens the existing player profile. Back returns to the adventurer profile or
leaderboard while preserving tab, period, filter, and scroll state.

Private morale values, exact injury rolls, private relationship notes, staff
pity, and unpublished commission preparation are not public.

### Public Integrity

- Every adventurer and Guild needs a stable server UUID.
- Names and tags use the same server-visible text sanitization as profiles and
  chat.
- The server calculates power, renown, rank, outcomes, and completion time.
- Public views are bounded to top rows, the current player's rows, or a selected
  profile. Clients do not subscribe to every adventurer record.

## Prestige

Personal prestige should strengthen the Guild connection without deleting or
relocking the collection.

- Once chartered, the Guild remains visible after prestige.
- Guild name, adventurers, staff, facilities, relationships, memorial, and
  career history persist.
- Completed prestiges unlock bounded Guild study, staff, applicant, or region
  tiers.
- Current-run recipe and item unlocks still control which provisions can be
  supplied, so a veteran Guild cannot bypass the new run's production chain.
- Seasonal renown resets on its own competition schedule, not on personal
  prestige.
- Do not add a separate Guild Legacy currency in the first release.

A separate voluntary Guild prestige can be reconsidered after the permanent
system has telemetry. It should not be designed before the connected loop and
seasonal competition are stable.

## Room And Interaction Plan

Keep four compact Guild tabs:

| Tab | Purpose |
| --- | --- |
| `hall` | Current activity, facilities, staff, relationships, and chronicle |
| `board` | Available, posted, supplied, and active commissions |
| `roster` | Applicants, adventurers, training, and private profiles |
| `world` | Adventurer leaderboard and public profile entry |

Move the current `log` into a Hall chronicle. Staff, facility, research, and
profile detail should use progressive disclosure instead of adding more room
tabs.

The Hall should always expose the next useful action, for example:

- `review 3 applicants`
- `2 commissions need provisions`
- `Mira returns in 34m`
- `Rowan can train`
- `latest: escort the town healer completed`

Use the project's ordinary border-labeled boxes, numbered rows, inline right
actions, shared progress rails, and standard dialogs. Do not extend the current
decorated fantasy request-card treatment into staff searches, research,
leaderboards, or profiles.

## Server Authority

> [!warning] Ranked Launch Blocker
> Current Guild state, coin, inventory, outcomes, XP, and rewards are carried in
> client-authored gameplay state. A shared ranked Guild cannot trust those
> values. Competitive launch requires server authority for every input that can
> change an adventurer's result or score.

The recommended solution is to make Guild coin spending and provision transfer
server-authoritative as part of the Guild transaction path. A temporary
server-earned Guild budget would be easier to secure, but it would recreate the
separate economy this plan is intended to remove.

### Server-Owned Records

| Record | Purpose |
| --- | --- |
| `guild` | Owner, public identity, level, reputation, and facility state |
| `guild_adventurer` | Career, stats, condition, status, power, and public identity |
| `guild_recruit_offer` | Server-generated candidate, price, and expiry |
| `guild_commission` | Definition, event link, risk, timing, outcome, and reward |
| `guild_commission_provision` | Explicit reserved and consumed supplies |
| `guild_relationship` | Bounded adventurer relationship edges |
| `guild_staff` | Owned staff, role, rank, and assignment |
| `guild_staff_draw_state` | Pool version, pity, duplicate progress, and audit data |
| `guild_study` | Completed server-relevant Guild studies |
| `guild_season_score` | Per-adventurer seasonal renown and tie-break fields |
| `guild_event` | Meaningful private and public career history |

### Reducer Rules

Reducers accept intent only:

- Create or rename Guild
- Hire an offered adventurer
- Start training
- Post, provision, remove, or start a commission
- Assign staff
- Upgrade a facility
- Search for or promote staff
- Complete a Guild study
- Claim a resolved result

Clients never submit XP, levels, stats, random rolls, outcomes, rewards, renown,
rank, completion time, or pity results.

All spends are atomic, activity starts are idempotent, and server time owns
offer expiry and activity completion. Due activities should resolve through
scheduled server work, not an unbounded client catch-up loop.

### Public And Private Views

- `own_guild_state`: complete private Guild state for the owner
- `own_guild_offers`: current recruitment and staff offers
- `public_guild_profile`: bounded public Guild identity and summary
- `public_adventurer_profile`: one selected public career
- `guild_adventurer_leaderboard_summary`: top rows plus the owner's relevant rows
- `own_guild_staff_draw_state`: private pity and duplicate progress

Add Guild owner identities to the bounded identity set used by the existing
player-profile flow. Do not expose private base tables through global
subscriptions.

## Client Architecture

Follow [[engineering-liveops/Architecture Boundaries|Architecture Boundaries]]:

```text
src/backend/guild/
  GuildBackendFacade.js
  managers/
    GuildSubscriptionManager.js
    GuildActionManager.js

src/gameplay/guild/
  GuildFacade.js
  managers/
    GuildRecruitmentManager.js
    GuildCommissionManager.js
    GuildProvisionManager.js
    GuildCareerManager.js
    GuildRelationshipManager.js
    GuildProgressionManager.js
    GuildFacilityManager.js
    GuildStaffManager.js
    GuildRankingManager.js

src/pages/guild/
  GuildPageFacade.js
  managers/
    focused rendering and interaction managers
```

- Backend code owns SpacetimeDB subscriptions and reducer calls.
- Gameplay projects server records into ECS state and derives snapshots.
- Gameplay rules remain independent from DOM, canvas, and transport.
- Page code renders snapshots and sends player intent through facades.
- Snapshot getters remain read-only.
- Managers stay narrow and do not combine recruitment, simulation, rewards,
  relationships, rankings, and persistence in one class.

## Migration From Current Guilds

Existing players must not lose their Guild.

1. Copy Guild name, tag, color, creation time, adventurer names, icons,
   personalities, and meaningful history into server records.
2. Assign new server UUIDs to the Guild and every adventurer.
3. Convert the secretary into the starter steward.
4. Map secretary level to a bounded Hall and request-board baseline.
5. Rebaseline adventurer stats and power with a documented server formula.
6. Preserve dead adventurers as memorial records.
7. Start all seasonal renown at zero.
8. Mark imported records as legacy founders for support and audit purposes.
9. Keep the old save branch until server migration is verified and accepted.

Imported client-authored stats, XP, rewards, and outcomes cannot enter ranked
history as trusted values.

See [[engineering-liveops/Save And Sync|Save And Sync]] and
[[engineering-liveops/Operational Risks|Operational Risks]] before designing
the migration or removing old fields.

## Delivery Phases

### Phase 0: Lock Rules

- [ ] Approve the connected-loop principle and non-goals
- [ ] Define commission outcome and renown formulas
- [ ] Decide death and retirement policy
- [ ] Decide staff pool, odds, pity, ranks, and duplicate behavior
- [ ] Decide season length and leaderboard tie-breaks
- [ ] Decide which post-level-15 tasks may observe Guild actions
- [ ] Define the resource-authority prerequisite

### Phase 1: Server Foundation And Migration

- [ ] Add Guild tables, private views, public views, and intent reducers
- [ ] Add stable IDs, server time, scheduled activity resolution, and audit data
- [ ] Build backend facades and bounded subscriptions
- [ ] Implement safe one-time migration without deleting the old save branch
- [ ] Keep rankings disabled

### Phase 2: Connected Vertical Slice

- [ ] Coin-priced recruitment
- [ ] Coin-funded training
- [ ] One adventurer per commission
- [ ] Explicit potion provisions
- [ ] Weekly world-event commissions and contribution
- [ ] Adventurer XP, injury, recovery, and career history
- [ ] Guild remains accessible after prestige

### Phase 3: Living Hall And Guild Progression

- [ ] Bounded relationships and meaningful paired events
- [ ] Hall chronicle and current-activity summary
- [ ] Guild reputation and shallow facility progression
- [ ] Steward, healer, trainer, and recruiter roles without gacha

### Phase 4: Public World

- [ ] Public Guild and adventurer profiles
- [ ] Adventurer to Guild Master player-profile flow
- [ ] Unranked public career showcase
- [ ] Privacy, moderation, and bounded subscription verification

### Phase 5: Staff And Research

- [ ] Server-owned staff search, pity, duplicates, and audit history
- [ ] Staff assignments and facility interaction
- [ ] Guild studies inside the existing Research room
- [ ] Prestige-based Guild tier unlocks

### Phase 6: Ranked Seasons

- [ ] Confirm every ranked input and outcome is server-authoritative
- [ ] Run an unranked season and inspect economy and outcome telemetry
- [ ] Enable seasonal renown leaderboard and rewards
- [ ] Add exploit detection, settlement, and support tooling

Party commissions and cross-Guild encounters come only after the single-
adventurer competitive loop is stable.

## Acceptance Criteria

### Core Connection

- [ ] A useful Guild action starts with coin, a potion, normal research,
  prestige progress, or the current world event.
- [ ] Commission completion returns a visible result to normal progression or
  the current world event.
- [ ] The Guild does not create a disconnected daily loop or currency.
- [ ] Guild rewards do not bypass current-run recipe and item unlocks.

### Character System

- [ ] Adventurer growth reflects commissions, training, study, and mentoring.
- [ ] Rest and social activity affect condition and relationships rather than
  competitive XP.
- [ ] Meaningful relationship events appear in both participants' histories.
- [ ] Ordinary failure cannot permanently destroy a paid adventurer without an
  explicit deadly-risk decision.

### Shared World

- [ ] A weekly event can produce both wizard actions and Guild commissions.
- [ ] Guild commission contribution appears in the same event result.
- [ ] A leaderboard row shows adventurer name, Guild name, and Guild tag.
- [ ] Adventurer profile leads to the correct Guild Master player profile.

### Integrity And Persistence

- [ ] Refreshing, reconnecting, changing device time, or editing client state
  cannot change an active commission outcome.
- [ ] Clients never submit trusted XP, outcome, reward, renown, or pity values.
- [ ] Prestige never hides or deletes a chartered Guild.
- [ ] Existing Guild identity and adventurer history migrate without a wipe.

### Interface

- [ ] The Hall exposes the next useful action and active return times.
- [ ] Board rows show fit, risk, provisions, duration, and outcome range before
  departure.
- [ ] Tab, dialog, profile, and leaderboard navigation preserve scroll and
  selection state.
- [ ] Room UI follows the existing sparse border-box language and does not use
  casino or decorated fantasy presentation for staff searches.

## Decisions To Lock

Recommended defaults:

- Guild is a personal NPC adventurer company; Trade Alliance remains the player
  group system.
- Adventurers are hired directly for coin; only staff uses gacha.
- Staff search uses coin and earned free searches, not a new currency.
- Potions are explicitly supplied and consumed at commission departure.
- Guild studies live in the Research room.
- Player prestige preserves the Guild and unlocks bounded Guild tiers.
- Seasonal renown ranks achievement; power is displayed separately.
- Ordinary contracts cause injury, not permanent death.
- No equipment, real-time PvP, party commissions, or cross-Guild encounters in
  the first connected release.
- No ranked launch before server authority covers supplies, spending, outcomes,
  XP, and renown.

## Open Questions

1. Should selected Guild requirements be mandatory after level 15, or should
   they be alternate requirements? Recommendation: use occasional mandatory
   requirements only after the connected loop proves reliable.
2. Should a competitive season be weekly or span four weekly world events?
   Recommendation: four events, so one bad week does not decide the season.
3. Should the primary board rank every adventurer or one declared champion per
   Guild? Recommendation: rank every adventurer and add a separate champion
   filter if large rosters dominate the top rows.
4. What coin curve, odds, and hard-pity count make staff searches meaningful
   without consuming the whole research and capacity economy?
5. Should successful commissions ever create personal Market demand?
   Recommendation: test this after the commission economy is stable, not in the
   first vertical slice.
6. Which existing potions map cleanly to risk counters without creating one
   mandatory best provision for every commission?
7. How should old high-level adventurers be rebaselined without erasing their
   identity or granting untrusted ranked power?

## Related

- [[Guilds]]
- [[Core Loop]]
- [[Production Systems]]
- [[Market Systems]]
- [[Tasks And Leveling]]
- [[Research And Unlocks]]
- [[Prestige]]
- [[Events And Social]]
- [[balance/Currencies|Currencies]]
- [[balance/Capacity Gates|Capacity Gates]]
- [[balance/Balance Watchlist|Balance Watchlist]]
- [[engineering-liveops/Architecture Boundaries|Architecture Boundaries]]
- [[engineering-liveops/Backend Authority|Backend Authority]]
- [[engineering-liveops/Save And Sync|Save And Sync]]
- [[engineering-liveops/Operational Risks|Operational Risks]]
