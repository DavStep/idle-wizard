# Retained Pixi Guild

`GuildPixiPage` is the canvas-only production view for the current Guild
surface. The locked gate, charter gate, four tab panels, and all seven fixed
sections are constructed once. Quest papers, roster rows, applicant rows, and
logs use keyed bounded pools. Every Guild dialog is a lazy-once
`DialogRegistry` entry.

Production places Hall, Board, Roster, and Log in the alternate global Guild
HUD. The page keeps the same selected-tab model but hides its legacy local tab
row when `navigationPlacement` is `hud`, allowing its active scroll panel to
use the space above the Guild bottom strip. World Chat and the normal room tabs
are not part of Guild mode; the Workshop icon in the Guild strip returns to the
normal room HUD.

The view consumes display state and calls actions; Guild simulation,
affordability, quest generation, hiring, firing, and secretary upgrades remain
owned by the existing gameplay facade. The preferred presenter shape is:

```js
{
  guild: {
    unlocked, unlockLevel, created, charterCostCoin, canCreate,
    profile: { name, tag, color },
    secretary: {
      level, hiredCap, boardSlots, canUpgrade,
      next: { level, hiredCap, boardSlots, costCoin } | null
    },
    board: [request],
    normalBoard: [request],
    eventBoard: [request],
    availableRequests: [request],
    adventurers: [person],
    applicants: [person],
    logs: [{ id, text, tone }],
    applicantResetLabel,
    boardWaveLabel
  },
  selectedTabId: 'hall' | 'board' | 'adventurers' | 'log',
  dialogs: {
    charter, settings, request, requestStack, adventurer, applicant
  },
  actions: {
    selectTab,
    createGuild,
    updateGuildProfile,
    upgradeSecretary,
    postRequest,
    removeRequest,
    hireApplicant,
    fireAdventurer,
    onActivate,
    onDeactivate
  },
  subscribe(callback)
}
```

`request` display fields are `id`, `title`, `lore`, `difficulty`,
`statLabel`, `rewardText`, `expiresLabel`, and optional `eventLabel`.
`person` display fields are `id`, `displayName`, `iconKey`, `level`,
`status`, `statusLabel`, `personalityLabel`, `stats`, `history`, and optional
dialog-ready tab rows. Adventurer and applicant tabs use the shared
whole-dialog footer geometry inside the brown shell, below the paper content;
they do not own feature-local buttons or external tab placement.

Charter/settings dialogs use the shared `TextEntryService`; their profile
payload is `{ name, tag, color }`. Request-stack dialogs receive
`{ requests, selectedIndex, boardFull, onPost }`. Person dialogs receive
`{ card, actionLabel, actionEnabled, action }`.

The adapter accepts the current raw `GuildFacade.getSnapshot()` shape and
method aliases such as `upgradeGuildSecretary`, `postGuildRequest`, and
`removeGuildRequest` during cutover. These aliases are routing only and do not
duplicate gameplay behavior.

## Snapshot adapter

`createGuild(options)` accepts:

```js
createGuild({
  gameplaySnapshot, // GameplayFacade.getSnapshot() or GuildFacade.getSnapshot()
  selectedTabId,
  gameplayActions,  // existing GameplayFacade/GuildFacade
  actions: { ui: { selectTab, onActivate, onDeactivate } },
  dialogs,          // optional display-ready dialog overrides
  tabNotifications,
  subscribe         // emits the next raw gameplay snapshot
})
```

It returns the preferred presenter shape above and binds the existing
`createGuild`, `updateGuildProfile`, `upgradeGuildSecretary`,
`postGuildRequest`, `removeGuildRequest`, `hireGuildApplicant`, and
`fireGuildAdventurer` methods without copying their rules into rendering.
