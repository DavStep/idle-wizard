# Retained global Pixi dialogs

This directory owns the production global dialog display trees. Each registered
factory receives the shared `PixiUiRuntimeFacade` context, constructs only on
its first `DialogRegistry.open()`, and is retained until application shutdown.
Closing a dialog only deactivates its subscriptions, text-entry session, modal
handle, ticker work, rendering, and interaction.

Every retained global dialog replays the shared 175ms Pixi open motion without
rebuilding its display tree. The backdrop and panel stay at full authored alpha
while the panel scales from `0.94` through the center (`1.02`) or top-panel
(`1.015`) overshoot and settles at `1`. Reduced-motion mode displays the settled
state immediately; close and shutdown cancel and restore all motion state.

The shared retained-global base caps the visible Root Run shell at `324px`,
leaving a `5%` inset on both sides of the `360px` source screen. After the
shell outsets and dialog padding, retained global dialog content is at most
`264px` wide. Feature dialogs reflow their content inside that cap rather than
scaling or stretching the display tree.

Register the suite before the Pixi runtime is initialized:

```js
import {
  registerGlobalDialogFactories,
} from './rendering/pixi/global/dialogs/index.js';

registerGlobalDialogFactories(renderFacade);
```

Canonical IDs:

- `global.settings`
- `global.feedback` (`bug` and `feature` route here with a `kind` view-model field)
- `global.level`
- `global.inbox` (`mail` routes here)
- `global.player`
- `global.alliance`
- `global.announcement`
- `global.confirmation`

Open `/src/dev/uiRecipes/inbox-dialog.html?empty=1` to inspect the real retained
empty inbox without gameplay setup, backend state, or save publication.

The views accept renderer-neutral view models. Common fields are:

```text
settings
  tabId, account, feedback, preferences, settings/categories, actions

level
  currentLevel, maxLevel, selectedLevel, levels[]
  levels[].{level,current,unlocked,addedRows,totalRows}

inbox
  connected, mail[]
  mail[].{mailKey,title,body,meta/read,hasReward,rewardText,rewardCollected}
  actions.{markVisibleRead,claimReward}

player
  loading, player.{username,character,playerLevel,prestigeCount,
  totalProducedCoin,allianceId,allianceName,allianceTag,allianceTagColor}
  actions.openAlliance

alliance
  connected, loading, alliance, members[], ownAlliance
  actions.{activate,deactivate,openPlayer,joinAlliance,applyAlliance}

announcement
  title, copy/body, rows, kind/variant, framed, dismissible, actions

confirmation
  title, message, rows, status, cancelLabel, confirmLabel, value, actions
```

Repeated settings choices, avatars, level rows, mail cards, alliance members,
announcement rows, and confirmation rows use bounded keyed pools. Input
handlers are installed once at widget construction; `bind()` only replaces
data and action references, while `reset()` clears state and interaction.
