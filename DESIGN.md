---
name: Idle Wizard
description: Minimal text-first mobile idle game with sparse bordered room panels.
colors:
  room-bg: "#dedede"
  room-surface: "#e5e5e5"
  ink: "#1a1a1a"
  muted: "#5e5e5e"
  disabled: "#969696"
  active-surface: "#d6d6d6"
  notification-red: "#c1121f"
  notification-orange: "#d66a00"
  black-theme-bg: "#1a1a1a"
  black-theme-surface: "#202020"
  black-theme-ink: "#e8e8e8"
  midnight-theme-bg: "#1c1e26"
  midnight-theme-ink: "#d4d4d4"
typography:
  body:
    fontFamily: "Lexend, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "normal"
    letterSpacing: "normal"
  title:
    fontFamily: "Lexend, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: "normal"
    letterSpacing: "normal"
  dialog-title:
    fontFamily: "Lexend, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "normal"
    letterSpacing: "normal"
  border-label:
    fontFamily: "Lexend, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "16px"
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
    backgroundColor: "{colors.room-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.dialog-padding}"
---

# Design System: Idle Wizard

## 1. Overview

**Creative North Star: "The Plain Room Ledger"**

Idle Wizard uses sparse room UI that behaves like a readable ledger inside a fixed mobile game surface. The authored design size is 1080x2170; room UI is built at source scale, then fitted to the viewport. Do not make source text larger to solve mobile readability.

The system rejects decorated fantasy RPG UI, colorful idle dashboards, modern rounded mobile cards, gradients, icon-heavy controls, textures, illustration, and decorative shadows. Interface choices should feel like A Dark Room-style text-game controls without copying that game's desktop dimensions.

**Key Characteristics:**
- Fixed authored portrait room surface with scaled source UI.
- Black or near-black text on plain light surfaces by default.
- Compact bordered boxes, embedded border titles, and tab labels on borders.
- Lowercase player-facing labels.
- Motion only for room entry, popup entry, overlay fade, and compact state feedback.

## 2. Colors

Palette is functional, mostly monochrome, and intentionally low-ornament.

### Primary
- **Ledger Ink:** Primary text and strokes. It is the main interactive color and carries buttons, rows, progress fills, and borders.

### Secondary
- **Notification Red:** Normal-priority notification dots only.
- **Notification Orange:** Lower-priority notification dots only.

### Neutral
- **Room Background:** App shell background behind the fixed game stage.
- **Room Surface:** Room pages, panels, boxes, buttons, dialogs, and border-title backplates.
- **Muted Text:** Secondary status, helper rows, dividers, and inactive system copy.
- **Disabled Text:** Locked, empty, unavailable, disabled, and unrevealed rows.
- **Active Surface:** Pressed button or temporary active control surface.

### Named Rules

**The Monochrome Default Rule.** Use black text, gray state colors, and white or gray surfaces unless the user explicitly requests colored UI.

**The Color Has a Job Rule.** Red and orange mean notification priority. Resource colors are optional settings; they must disappear into disabled state when a row is locked or unavailable.

## 3. Typography

**Display Font:** none  
**Body Font:** Lexend with system sans fallbacks  
**Label/Mono Font:** tabular lining numerals through font-variant, not a separate mono face

**Character:** Text is calm, readable, and compact. Hierarchy comes from position, borders, underline state, and occasional bold labels, not from large type.

### Hierarchy
- **Title** (bold, 15px, normal line-height): Embedded box titles and important row names.
- **Dialog Title** (bold, 16px, normal line-height): Popup border titles only.
- **Body** (regular, 15px, normal line-height): Room rows, button labels, resource values, and status text.
- **Border Label** (regular, 13px, 16px line-height): Counts, close controls, popup tabs, bottom-border actions, and compact category controls.

### Named Rules

**The Source Scale Rule.** Keep source UI text at 15px and make mobile readable through the room UI scale layer.

**The Lowercase Rule.** Player-facing labels stay lowercase unless they are user-entered names or external proper nouns.

## 4. Elevation

Ordinary room UI is flat. Depth is communicated by 1px borders, title placement, and popup layering. Only dialogs, overlays, and tooltips use shadow, and those shadows are structural.

### Shadow Vocabulary
- **Dialog Shadow** (`5px 5px 5px var(--style-muted)`): Popup/dialog panels only.
- **Overlay Shadow** (`5px 5px 5px var(--style-muted)`): Rare overlay panels.
- **Tooltip Shadow** (`-1px 3px 2px var(--style-muted)`): Small tooltips only.

### Named Rules

**The Flat Room Rule.** Non-dialog room boxes never get shadows.

**The Dialog Weight Rule.** Popup panels use 2px border, 20px padding, and the bottom-right shadow; ordinary boxes do not borrow this treatment.

## 5. Components

### Buttons
- **Shape:** Sharp text boxes with no radius (0).
- **Default:** Room surface background, ink text, 1px ink border, 5px 10px padding.
- **Hover / Focus:** Underline the label; no glow, icon, scale, or color flourish.
- **Active:** Flat active-surface fill.
- **Disabled:** Disabled gray text and border, no underline.

### Cards / Containers
- **Corner Style:** Square corners (0).
- **Background:** Room surface.
- **Shadow Strategy:** No shadow for ordinary panels.
- **Border:** 1px ink border for room boxes and panels.
- **Internal Padding:** Compact source padding (5px 10px).
- **Title:** Embedded on the top border over the same surface, bold 15px.

### Inputs / Fields
- **Style:** Same surface, same source typography, 1px border, no radius.
- **Focus:** No decorative focus glow; preserve clear text entry and mobile keyboard behavior.
- **Error / Disabled:** Error copy stays compact, disabled fields use disabled gray.

### Navigation
- **Bottom Room Tabs:** Five equal tabs at the bottom center, source 13px, active tab underlined.
- **Popup Tabs:** Sit below and outside the bordered dialog, use 2px stroke, and keep an 8px source gap.
- **Page Names:** All five room page names stay visible in bottom chrome.

### Progress
- **Rail:** 3px high, surface background, 1px ink border.
- **Fill:** Ink fill, no timer text inside the rail.

### Signature Component

**Border-Labeled Box:** A compact box with its title embedded over the top border and optional count/action labels centered on the border line. Use this before inventing another heading, row, popup, tab, or action style.

## 6. Do's and Don'ts

### Do:
- **Do** reuse `docs/ui-patterns.md` before creating any new row, box, popup, tab, or border-label treatment.
- **Do** keep source typography at 15px body, 16px dialog title, and 13px border label.
- **Do** use 1px borders for ordinary boxes and 2px borders only for dialogs or popup tabs.
- **Do** keep row actions inline and right-aligned with tabular numerals.
- **Do** support reduced motion by removing nonessential transitions and animations.

### Don't:
- **Don't** make the UI look like a decorated fantasy RPG, card battler, casino idle game, colorful dashboard, or modern rounded mobile app.
- **Don't** use gradients, textures, illustrations, icons, rounded cards, or decorative shadows.
- **Don't** add color except notification/resource state or an explicit user request.
- **Don't** put headings inside boxes when the label belongs embedded over the border.
- **Don't** inflate source font size to make mobile text readable.
