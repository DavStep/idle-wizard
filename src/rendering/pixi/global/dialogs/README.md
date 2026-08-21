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

The Settings configuration pane exposes the application-owned live-update
probe through a standard yellow text button. The button is single-flight while
checking. Up-to-date and failed probes use the retained announcement surface;
available bundles use the retained confirmation surface before installation.

The shared retained-global base caps the visible Root Run shell at `324px`,
leaving a `5%` inset on both sides of the `360px` source screen. After the
shell outsets and dialog padding, retained global dialog content is at most
`264px` wide. Feature dialogs reflow their content inside that cap rather than
scaling or stretching the display tree.

Dialogs whose main body is a vertical scroll viewport use the shared adaptive
height resolver. The authored `844px` logical surface keeps its exact baseline
height; taller portrait surfaces add the available logical-height delta to the
scroll viewport, while fixed-content dialogs and compact nested scroll regions
keep their authored height. These viewports use `RetainedScrollArea` and its
overflow-only yellow right-edge station scrollbar. They never append a
horizontal progress rail or bottom fade as a scroll cue.

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
- `global.chatReport`
- `global.level`
- `global.inbox` (`mail` routes here)
- `global.player`
- `global.friends`
- `global.directMessage`
- `global.alliance`
- `global.allianceRank`
- `global.announcement`
- `global.confirmation`

Open `/src/dev/uiRecipes/inbox-dialog.html?empty=1` to inspect the real retained
empty inbox without gameplay setup, backend state, or save publication.

The Inbox uses each pooled mail card as its own paper section; it hides the
dialog's continuous inner paper and gives its primary scroll viewport the
shared adaptive maximum height. The shell fits the current message-section
stack and only uses that maximum when overflow needs scrolling. Message
sections begin at the dialog content boundary without an extra scroll-top
inset, use the shared `8px` section gap, and keep compact `10px` internal
content padding. World-event reward cards use the event headline as their
title, including a compatibility fallback for already-issued `Event finished`
mail.

Open `?devUi=researchCompleteAnnouncement` to inspect the retained
research-complete ribbon, centered research icon, and row composition without
completing research or publishing gameplay state.

Open `?devUi=global.confirmation` to inspect the production confirmation shell,
centered message area, and paired actions after the game surfaces mount.

Open `?devUi=chatReport` to inspect the production World Chat report form with
its multiline reason field and disabled-until-nonempty submit action. The form
stack starts `12px` below the content boundary so the field has slightly more
top clearance than the submit action has visible bottom clearance. The
field-to-action band is `22px`, reserving one compact validation line with
`4px` clearance above and below.

The views accept renderer-neutral view models. Common fields are:

```text
settings
  tabId, account, feedback, preferences, settings/categories, actions

chatReport
  message, value, status, pending, focusInput, actions.submit

level
  currentLevel, maxLevel, selectedLevel, levels[]
  levels[].{level,current,unlocked,addedRows,totalRows}

inbox
  connected, mail[]
  mail[].{mailKey,title,body,meta/read,hasReward,rewardText,rewardCollected}
  actions.{markVisibleRead,claimReward}

player
  loading, ownPlayer, player.{username,character,playerLevel,prestigeCount,
  totalProducedCoin,allianceId,allianceName,allianceTag,allianceTagColor}
  actions.{openAlliance,openCosmetics}

alliance
  connected, loading, alliance, members[], ownAlliance, ownApplications[]
  actions.{activate,deactivate,openPlayer,joinAlliance,applyAlliance}

announcement
  title, copy/body, rows, kind/variant, framed, dismissible, actions

confirmation
  title, message, rows, status, cancelLabel, cancelColor,
  confirmLabel, confirmColor, value, actions
```

Framed announcement copy is centered on both axes inside its requested content
box. The World Chat report placeholder response requests `104px` of content
height so its two-line reminder remains centered with comfortable vertical air.

Confirmation copy is centered inside the body area above the actions. The
paper keeps a `124px` minimum content height, and callers may select any shared
regular-button color for each action without changing the button contract.

Repeated settings choices, avatars, level rows, mail cards, alliance members,
announcement rows, and confirmation rows use bounded keyed pools. Input
handlers are installed once at widget construction; `bind()` only replaces
data and action references, while `reset()` clears state and interaction.
