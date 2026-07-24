---
name: Idle Wizard
description: Minimal text-first mobile idle game with sparse bordered room panels.
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
  none: "0"
spacing:
  panel-padding: "5px 10px"
  dialog-padding: "20px"
  dialog-tab-gap: "8px"
  row-min-height: "20px"
  row-column-gap: "6px"
  room-edge: "16px"
components:
  button:
    backgroundColor: "{colors.room-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "5px 10px"
    width: "100px"
  button-disabled:
    backgroundColor: "{colors.room-surface}"
    textColor: "{colors.disabled}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "5px 10px"
    width: "100px"
  room-box:
    backgroundColor: "{colors.room-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.panel-padding}"
  dialog:
    backgroundColor: "#ffe7c8"
    textColor: "#634934"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.dialog-padding}"
    frame: "Root Run Expedition brown dialog-back nine-slice"
    titleFrame: "Root Run Expedition blue title plaque"
    closeControl: "Root Run Expedition round X below the shell"
---

# Design System: Idle Wizard

## 1. Overview

**Creative North Star: "The Plain Room Ledger"**

Idle Wizard uses sparse room UI that behaves like a readable ledger inside a fixed mobile game surface. The logical game resolution matches Root Run at 390x844; room UI is built in those logical pixels, then contain-fitted to the viewport. Do not make source text larger to solve mobile readability.

The system rejects decorated fantasy RPG UI, colorful idle dashboards, modern rounded mobile cards, gradients, decorative or icon-heavy controls, textures, illustration, and decorative shadows. The shared Root Run dialog shell is the deliberate bounded exception: it gives modal hierarchy without spreading decorated chrome into ordinary room UI.

**Key Characteristics:**
- Fixed authored portrait room surface with scaled source UI.
- Light text on plain midnight surfaces by default.
- Compact bordered boxes, embedded box titles, Root Run-framed dialogs, and tab labels below modal shells.
- Lowercase player-facing labels.
- Motion only for room entry, popup entry, overlay fade, and compact state feedback.

## 2. Colors

Palette is functional, mostly monochrome, and intentionally low-ornament.

### Primary
- **Ledger Ink:** Primary text. It carries labels, rows, buttons, and strong values.

- **Ledger Stroke:** Primary theme strokes. It frames the ledger without competing with text.

### Secondary
- **Notification Red:** Normal-priority notification dots only.
- **Notification Orange:** Lower-priority notification dots only.

### Neutral
- **Room Background:** App shell background behind the fixed game stage.
- **Room Surface:** Room pages, panels, boxes, and buttons. Box-border titles stay transparent; dialogs use their fixed paper palette.
- **Muted Text:** Secondary status, helper rows, dividers, and inactive system copy.
- **Disabled Text:** Locked, empty, unavailable, disabled, and unrevealed rows.
- **Active Surface:** Same as room surface, so press states never tint backgrounds.

### Named Rules

**The Quiet Surface Rule.** Use high-contrast text, gray state colors, and quiet midnight surfaces for chrome and layout surfaces. Currency labels keep their icon, amount, and currency word together, while all resource and currency text inherits the surrounding theme or state color.

**The Color Has a Job Rule.** Red and orange mean notification priority. Resource icons identify resource types; seed, herb, potion, mana, coin, crystal, emerald, and ruby text stays monochrome and follows normal disabled, locked, and unavailable state colors.

## 3. Typography

**Display Font:** none  
**Body Font:** Lilita One with Arial/system sans fallbacks, matching Root Run
**Label/Mono Font:** tabular lining numerals through font-variant, not a separate mono face

**Character:** Text is calm, readable, and compact. Hierarchy comes from position, borders, selected frames, and occasional bold labels, not from large type. Interaction states never change font weight.

### Hierarchy
- **Title** (bold, 13px, normal line-height): Embedded box titles and important row names.
- **Dialog Title** (bold, 14px, normal line-height): White outlined text centered in the Root Run blue title plaque.
- **Body** (regular, 13px, normal line-height): Room rows, button labels, resource values, and status text.
- **Border Label** (regular, 11px, 14px line-height): Counts, popup tabs, bottom-border actions, and compact category controls.

### Named Rules

**The Source Scale Rule.** Keep source UI text at 13px and make mobile readable through the room UI scale layer.

**The Lowercase Rule.** Player-facing labels stay lowercase unless they are user-entered names or external proper nouns.

## 4. Elevation

Ordinary room UI is flat. Available themes use 2px ordinary borders for clear themed strokes. Depth is communicated by borders, title placement, and popup layering. Default dialogs use their brown outer frame plus one compact shadow; overlays and tooltips may use structural shadows.

### Shadow Vocabulary
- **Dialog Shadow** (`3px 4px 4px rgb(0 0 0 / 42%)`): Attached to the brown Root Run dialog shell only.
- **Overlay Shadow** (`5px 5px 5px var(--style-muted)`): Rare overlay panels.
- **Tooltip Shadow** (`-1px 3px 2px var(--style-muted)`): Small tooltips only.

### Named Rules

**The Flat Room Rule.** Non-dialog room boxes never get shadows.

**The Dialog Weight Rule.** Popup panels use the brown Root Run Expedition outer nine-slice, its paper inner nine-slice, separate blue title plaque, round X control centered below the shell, 20px padding, and one bottom-right shadow. Ordinary boxes do not borrow this treatment.

## 5. Components

### Buttons
- **Shape:** Sharp text boxes with no radius (0).
- **Default:** Room surface background, ink text, theme ordinary border, 5px 10px padding.
- **Focus:** Use the existing border state; do not change font weight or add a below-text line, glow, icon, scale, or color flourish. Do not define mouse-hover states.
- **Active:** No background tint; keep labels stable and use existing text/border state only.
- **Disabled:** Disabled gray text and border, normal weight.

### Cards / Containers
- **Corner Style:** Square corners (0).
- **Background:** Room surface.
- **Shadow Strategy:** No shadow for ordinary panels.
- **Border:** 2px ordinary border in selectable themes.
- **Internal Padding:** Compact source padding (5px 10px).
- **Title:** Embedded transparently on the top border, bold 13px.

### Inputs / Fields
- **Style:** Same surface, same source typography, theme ordinary border, no radius.
- **Focus:** No decorative focus glow; preserve clear text entry and mobile keyboard behavior.
- **Error / Disabled:** Error copy stays compact, disabled fields use disabled gray.

### Navigation
- **Bottom Room Tabs:** Five equal icon tabs use Root Run's active/inactive station-tab nine-slice assets and share one bottom baseline. Their lower stretch region overscans past the authored screen edge. The active tab rises 10 source pixels, enlarges its icon, and reveals its source-11px page name; inactive tabs sit lower with dimmer icons and hidden visual labels.
- **Popup Tabs:** Sit below and outside the bordered dialog, keep an 8px source gap, and reuse the shared very-dark deselected and lighter-brown selected Root Run button skins.
- **Page Names:** The current room name appears inside the raised active tab; inactive room names remain available through accessible labels.

### Dialogs
- **Outer Shell:** Brown Root Run Expedition `expedition-dialog-back.png` nine-slice, rendered outside the content box.
- **Content:** Root Run Expedition `expedition-dialog-front.png` paper nine-slice with brown ink.
- **Title:** Separate centered blue `expedition-dialog-title-blue.png` plaque with white outlined text.
- **Close:** Round `expedition-dialog-close.png` X control centered below the brown shell at the Expedition source gap; keep the accessible close label.
- **Authored Geometry:** Preserve Expedition's `1080px` source relationships at the `390px` logical width: `1008px` shell becomes `364px`; `976px` paper becomes `352px` with a `6px` horizontal inset, `31px` top inset, and `21px` compact-dialog bottom inset; `614x121px` title becomes `222x44px`; and the `114px` close becomes `41px` with a `23px` shell gap.
- **Title Type:** Match the exported title node, not the generic dialog label: `64px` Lilita One Regular with an `8px` black stroke on the `1080px` source canvas, scaled to `23.1px` type and a `2.9px` stroke at `390px`. Its `73px` source line box starts `22px` below the plaque top.
- **Transparency:** The PNG nine-slices own their centers and transparent corners. Do not paint rectangular fallback fills behind the shell, paper, title, or close artwork.
- **Exceptions:** First-run intro and explicitly feature-skinned panels keep their dedicated chrome.

### Progress
- **Rail:** Shared in-game rails use the compact Root Rush geometry at 10px source height. The top-panel quest rail intentionally keeps the original 14px source height. Both use a black capsule track, 1px outer stroke, dark inset rim, and 1px inner gap.
- **Fill:** Purple `#8740df` with a lighter `#bd72f3` inset edge is the shared default. Brewing uses blue, Garden uses green, and Market/Research use yellow. Keep fully rounded caps and timer text outside the rail.
- **Allocation Knob:** Use a 14px cream circle with a tan border and dark-brown outer ring, matching the layered round reference without any inner glyph.

### Signature Component

**Border-Labeled Box:** A compact box with its title embedded over the top border and optional count/action labels centered on the border line. Use this before inventing another heading, row, popup, tab, or action style.

## 6. Do's and Don'ts

### Do:
- **Do** reuse `docs/ui-patterns.md` before creating any new row, box, popup, tab, or border-label treatment.
- **Do** keep source typography at 13px body, 14px dialog title, and 11px border label.
- **Do** use 2px ordinary borders in selectable themes, the shared Root Run shell for default dialogs, and shared Root Run button skins for popup tabs.
- **Do** keep row actions inline and right-aligned with tabular numerals.
- **Do** support reduced motion by removing nonessential transitions and animations.

### Don't:
- **Don't** make the UI look like a decorated fantasy RPG, card battler, casino idle game, colorful dashboard, or modern rounded mobile app.
- **Don't** spread the approved dialog textures, illustrations, decorative icons, rounded cards, or decorative shadows into ordinary room UI.
- **Don't** add color except notification/resource state or an explicit user request.
- **Don't** put headings inside boxes when the label belongs embedded over the border.
- **Don't** inflate source font size to make mobile text readable.
