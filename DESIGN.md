---
name: Idle Wizard
description: Illustrated fantasy mobile idle game with tactile room landmarks and image-backed HUD chrome.
colors:
  room-bg: "#1c1e26"
  room-surface: "#17191f"
  ink: "#d4d4d4"
  muted: "#a6a6a6"
  stroke: "#3f465c"
  disabled: "#6a6a6a"
  active-surface: "{colors.room-surface}"
  notification-red: "#c1121f"
  notification-orange: "#d66a00"
  mana-blue: "#2fa8ff"
  quest-purple: "#8740df"
  coin-gold: "#f5c542"
  action-brown: "#9b6a2f"
  action-green: "#79b93f"
  action-red: "#b54c40"
  black-theme-bg: "#1a1a1a"
  black-theme-surface: "#202020"
  black-theme-ink: "#e8e8e8"
  black-theme-stroke: "#6a6a6a"
  midnight-theme-bg: "#1c1e26"
  midnight-theme-ink: "#d4d4d4"
typography:
  body:
    fontFamily: "Lilita One, Arial Black, Arial, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "normal"
    letterSpacing: "normal"
  title:
    fontFamily: "Lilita One, Arial Black, Arial, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: "normal"
    letterSpacing: "normal"
  dialog-title:
    fontFamily: "Lilita One, Arial Black, Arial, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "normal"
    letterSpacing: "normal"
  border-label:
    fontFamily: "Lilita One, Arial Black, Arial, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "14px"
    letterSpacing: "normal"
rounded:
  skin-owned: "image-backed"
spacing:
  panel-padding: "5px 10px"
  dialog-padding: "20px"
  dialog-tab-gap: "8px"
  row-min-height: "20px"
  row-column-gap: "6px"
  room-edge: "16px"
components:
  button:
    backgroundColor: "{colors.action-brown}"
    textColor: "#f7efe4"
    typography: "{typography.body}"
    rounded: "{rounded.skin-owned}"
    padding: "5px 10px"
    width: "100px"
  button-disabled:
    backgroundColor: "{colors.room-surface}"
    textColor: "{colors.disabled}"
    typography: "{typography.body}"
    rounded: "{rounded.skin-owned}"
    padding: "5px 10px"
    width: "100px"
  room-box:
    backgroundColor: "{colors.room-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.skin-owned}"
    padding: "{spacing.panel-padding}"
  dialog:
    backgroundColor: "#ffe7c8"
    textColor: "#634934"
    typography: "{typography.body}"
    rounded: "{rounded.skin-owned}"
    padding: "{spacing.dialog-padding}"
    frame: "Root Run Expedition brown dialog-back nine-slice"
    titleFrame: "Root Run Expedition purple title plaque"
    closeControl: "Root Run Expedition round X below the shell"
---

# Design System: Idle Wizard

## 1. Overview

**Creative North Star: "The Wizard's Living Workbench"**

Idle Wizard uses an illustrated fantasy HUD inside a fixed mobile game surface. Every room is organized around one large, recognizable production landmark, supported by compact status panels and tactile controls. The logical game resolution matches Root Run at 390x844; room UI is built in those logical pixels, then contain-fitted to the viewport. Do not make source text larger to solve mobile readability.

The approved Brewing reference defines the default visual lane: dark navy layered surfaces, rendered fantasy props, rounded image-backed panel frames, warm brown/gold controls, colored resource and state cues, compact outlined Lilita One labels, and controlled shadows. The system rejects only decoration without a gameplay job: casino clutter, arbitrary glow, unrelated ornaments, inconsistent art families, and generic flat cards.

**Key Characteristics:**
- Fixed authored portrait room surface with scaled source UI.
- Dark layered room surfaces with bright, high-contrast status text.
- One dominant illustrated room landmark, image-backed panels, Root Run-framed dialogs, and tactile station tabs.
- Colorful resource/item art and role-colored actions.
- Motion that explains room entry, selection, production state, rewards, popup entry, and compact press feedback.

## 2. Colors

Palette is functional and full enough to support fantasy materials, resources, actions, and production state without turning the room into a rainbow dashboard.

### Primary
- **HUD Ink:** Primary text. It carries labels, rows, buttons, and strong values.

- **Midnight Frame:** Blue-gray panel strokes and shadowed navy surfaces.

### Secondary
- **Notification Red:** Normal-priority notification dots only.
- **Notification Orange:** Lower-priority notification dots only.
- **Mana Blue:** Mana values and Brewing progress.
- **Quest Purple:** Player-level and quest progress.
- **Coin Gold:** Coin values and premium warm highlights.
- **Action Brown:** Default actionable controls.
- **Action Green:** Claim, collect, confirm, and positive completion actions.
- **Action Red:** Cancel, destructive, and loss-bearing actions.

### Neutral
- **Room Background:** App shell background behind the fixed game stage.
- **Room Surface:** Room pages and the dark underlay beneath image-backed panels. Dialogs use their fixed paper palette.
- **Muted Text:** Secondary status, helper rows, dividers, and inactive system copy.
- **Disabled Text:** Locked, empty, unavailable, disabled, and unrevealed rows.
- **Active Surface:** The skin-owned pressed state; preserve legibility and role color.

### Named Rules

**The Layered Midnight Rule.** Use dark navy room surfaces so colorful props, potion ingredients, resources, and actions read clearly. Panels may use authored texture, bevel, inset, and shadow when those details belong to the shared skin.

**The Color Has a Job Rule.** Color identifies resource type, progress family, action role, selection, or notification priority. Disabled and locked states still reduce contrast consistently; do not recolor controls merely for variety.

## 3. Typography

**Display Font:** none  
**Body Font:** Lilita One with Arial/system sans fallbacks, matching Root Run
**Label/Mono Font:** tabular lining numerals through font-variant, not a separate mono face

**Character:** Text is friendly, readable, compact, and strongly outlined over illustrated chrome. Hierarchy comes from position, art scale, panel grouping, selected frames, role color, and occasional bold labels. Interaction states never change font weight.

### Hierarchy
- **Title** (bold, 13px, normal line-height): Embedded box titles and important row names.
- **Dialog Title** (bold, 14px, normal line-height): White outlined text centered in the Root Run purple title plaque.
- **Body** (regular, 13px, normal line-height): Room rows, button labels, resource values, and status text.
- **Border Label** (regular, 11px, 14px line-height): Counts, popup tabs, bottom-border actions, and compact category controls.

### Named Rules

**The Source Scale Rule.** Keep source UI text at 13px and make mobile readable through the room UI scale layer.

**The Authored Case Rule.** Player-facing text keeps the capitalization supplied by feature copy. Rendering must not force labels to lowercase.

## 4. Elevation

Ordinary room UI uses shallow, skin-owned depth. Image-backed frames may carry bevels, inset shading, and compact cast shadows; the room landmark may have stronger grounded depth. Dialogs remain the heaviest layer and use their brown outer frame plus one compact shadow.

### Shadow Vocabulary
- **Dialog Shadow** (`3px 4px 4px rgb(0 0 0 / 42%)`): Attached to the brown Root Run dialog shell only.
- **Room Panel Shadow:** Authored inside the approved nine-slice or a compact hard shadow that matches the shared room-panel skin.
- **Overlay Shadow** (`5px 5px 5px var(--style-muted)`): Rare overlay panels.
- **Tooltip Shadow** (`-1px 3px 2px var(--style-muted)`): Small tooltips only.

### Named Rules

**The Grounded Room Rule.** Ordinary panels may use the shared shallow depth, but must stay subordinate to the room landmark and dialogs.

**The Dialog Weight Rule.** Popup panels use the brown Root Run Expedition outer nine-slice, its paper inner nine-slice, separate purple title plaque, round X control centered below the shell, 20px padding, and one bottom-right shadow. Ordinary room panels use their own shared midnight skin and do not borrow the paper dialog treatment.

## 5. Components

### Buttons
- **Shape:** Image-backed rounded/chamfered controls with skin-owned corners, outlines, and shallow depth.
- **Default:** Brown/gold for general actions, green for positive claim/collect/confirm, red for cancellation or loss, and specialized shared skins for cost and tabs.
- **Content:** A meaningful icon may lead the label when it improves recognition; labels stay visible and accessible.
- **Focus:** Use the shared focus treatment; do not change font weight or add hover-only behavior.
- **Active:** Use the shared compressed press state while keeping the label and icon optically centered.
- **Disabled:** Swap to the shared gray button asset and keep normal text weight. Grayscale and monochrome shaders are icon-only and must not be applied to button chrome.

### Cards / Containers
- **Corner Style:** Owned by the shared panel nine-slice, typically softly rounded with a dark outline.
- **Background:** Layered midnight/navy surface with authored inset shading.
- **Shadow Strategy:** Compact, directional, and shared; stronger only for the dominant landmark or modal layer.
- **Border:** Image-backed frame or approved generated nine-slice, never an arbitrary feature-local radius and shadow.
- **Internal Padding:** Compact source padding sized to the panel's artwork and content.
- **Title:** Strong top-left title within the panel composition; legacy border-labeled boxes may keep embedded border titles until redesigned.

### Inputs / Fields
- **Style:** Shared dark or dialog-paper field skin, compact outlined typography, and skin-owned corners.
- **Focus:** Clear shared focus ring or frame change; preserve mobile keyboard behavior.
- **Error / Disabled:** Error copy stays compact, disabled fields use disabled gray.

### Navigation
- **Bottom Room Tabs:** Five equal icon tabs use Root Run's full active/inactive room-tab background assets, fill the source width, and share one bottom baseline with an `8px` source safe gap below the complete frame. Active/inactive frames are `56px`/`44px` tall before the shared `18px` lower region. Icons stay at full color and opacity in every unlocked state. The active tab rises `12px`, enlarges its icon, and reveals its white source-11px Title Case page name; inactive tabs sit lower with hidden visual labels. Locked tabs replace the room icon with a larger lock centered lower in the inactive frame.
- **Popup Tabs:** Sit below and outside the bordered dialog, keep an 8px source gap, and reuse the shared very-dark deselected and lighter-brown selected Root Run button skins.
- **Page Names:** The current room name appears inside the raised active tab; inactive room names remain available through accessible labels.

### Dialogs
- **Outer Shell:** Brown Root Run Expedition `expedition-dialog-back.png` nine-slice, rendered outside the content box.
- **Content:** Root Run Expedition `expedition-dialog-front.png` paper nine-slice with brown ink.
- **Title:** Separate centered purple `expedition-dialog-title-purple.png` plaque with white outlined text.
- **Close:** Round `expedition-dialog-close.png` X control centered below the brown shell at the Expedition source gap; keep the accessible close label.
- **Authored Geometry:** Preserve Expedition's `1080px` source relationships at the `390px` logical width: `1008px` shell becomes `364px`; `976px` paper becomes `352px` with a `6px` horizontal inset, `31px` top inset, and `21px` compact-dialog bottom inset; `614x121px` title becomes `222x44px`; and the `114px` close becomes `41px` with a `23px` shell gap.
- **Title Type:** Match the exported title node, not the generic dialog label: `64px` Lilita One Regular with an `8px` black stroke on the `1080px` source canvas, scaled to `23.1px` type and a `2.9px` stroke at `390px`. Its `73px` source line box starts `22px` below the plaque top.
- **Transparency:** The PNG nine-slices own their centers and transparent corners. Do not paint rectangular fallback fills behind the shell, paper, title, or close artwork.
- **Coverage:** All game dialogs use this shell, including Shop, Guild, and app-level blocker gates. Non-dismissible flows hide the close action; feature-specific artwork belongs inside the paper content area. The first-run cutscene keeps its narrative inside an ordinary border-labeled box with a yellow action button. Full-screen progress and feature-unlock announcement screens remain centered, unframed compositions; only report-style announcements use dialog chrome.

### Progress
- **Rail:** Shared passive in-game rails use the compact Root Rush geometry at 10px source height. Interactive sliders and the top-panel quest rail use 14px source height. Both use a black capsule track, 1px outer stroke, dark inset rim, and 1px inner gap.
- **Fill:** Purple `#8740df` with a lighter `#bd72f3` inset edge is the shared default. Brewing uses blue, Garden uses green, and Market/Research use yellow. Keep fully rounded caps and timer text outside the rail.
- **Allocation Knob:** Use a 14px cream circle with a tan border and dark-brown outer ring, matching the layered round reference without any inner glyph.

### Signature Component

**Illustrated Room Workbench:** One dominant room-specific landmark inside a shared framed panel, with nearby status, pagination, and role-colored actions. Use shared buttons, rails, item art, and panel skins around it. Legacy border-labeled boxes remain supported for existing compact lists until those surfaces are intentionally redesigned.

## 6. Do's and Don'ts

### Do:
- **Do** reuse `docs/ui-patterns.md` before creating any new row, box, popup, tab, or border-label treatment.
- **Do** keep source typography at 13px body, 14px dialog title, and 11px border label.
- **Do** use shared image-backed room panels, the shared Root Run shell for dialogs, and shared Root Run button/tab skins.
- **Do** use room landmarks and item/resource art as functional content.
- **Do** keep action colors consistent: brown/gold general, green positive, red cancellation/loss.
- **Do** keep row actions inline and right-aligned with tabular numerals.
- **Do** support reduced motion by removing nonessential transitions and animations.

### Don't:
- **Don't** turn the fantasy treatment into casino clutter, arbitrary glow, or unrelated ornament.
- **Don't** invent feature-local panel, button, or icon families when the shared fantasy HUD library can cover the role.
- **Don't** use color without a resource, action, selection, progress, or notification role.
- **Don't** place several equally dominant illustrated panels on one room surface.
- **Don't** inflate source font size to make mobile text readable.
