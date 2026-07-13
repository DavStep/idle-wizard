# UI Patterns

Use this file to record repeated interface choices. Before adding new UI, check for a similar pattern here and reuse it.

## Box Construction

- Ordinary room boxes use compact padding, no shadow, and `2px` ordinary borders in selectable themes.
- Box titles sit embedded over the top border on the same room surface.
- Box and dialog titles keep plain title text in selectable themes.
- Secondary border labels, such as counts, close/current controls, actions, and tabs, use smaller normal-weight text centered on the border line.
- Popup/dialog boxes use the thicker dialog treatment: `2px` border, `20px` padding, and bottom-right shadow.
- Full-page room scroll areas use `style-page-scroll` on the actual scrolling element, with inline scroll cues and the shared `--style-page-scroll-padding-top` / `--style-page-scroll-padding-bottom` cuts so content tucks under chrome consistently.

## Numbered Rows

- Numbered game rows use a narrow left number cell, written as `1.`, `2.`, etc.
- Main item/content text sits in the middle.
- Price, status, timer, or action sits right-aligned in one fixed right slot.
- Never leave the middle content blank. Unlocked empty slot rows should invite the next action, such as `select` or `request item`; locked empty rows still name the thing, such as `empty stand` or `empty request`, with the right slot carrying requirement/state.
- Item market rows without numbers use the same compact middle/right rhythm as numbered rows; do not give stock/picker rows looser vertical padding.
- Do not write row type words such as `stand 1` when the surrounding box already gives the type.
- Market stand rows, player request rows, and garden plot rows should follow this same left-number, middle-content, right-action rhythm.

## Inline Row Actions

- Row actions are text controls on the line, not separate decorative cards.
- Do not define mouse-hover states for row or button actions; press states must not tint row or button backgrounds.
- Underlines are allowed only for neutral selected options in mutually exclusive controls, such as tabs or one-of button panels; do not show them while held or pressed.
- Buy/place/claim prices stay right-aligned and use tabular numerals.
- Disabled or locked right-side actions use muted text and keep the same row height as enabled rows.

## Expandable Boxes

- Collapsed boxes keep one full summary row visible inside the box.
- Use a top-right border label for count or progress, such as `2/5`.
- Use a bottom-center border label as the toggle: `expand` when collapsed, `collapse` when open.
- Expand hidden rows in normal flow inside the same box, without overlaying nearby panels.
- Workshop tasks are the exception: reserve only the collapsed task slot in normal flow, then let the expanded box overlay lower Workshop content so action controls do not move.
- Workshop tasks may show one muted `next:` compass line above the summary requirement; it is derived from live requirements, not tutorial copy.
- Notification dots may appear on `expand` when hidden rows need attention, but never on `collapse`.

## Popup Structure

- Dialog titles are embedded border titles.
- Close controls sit as normal-weight border labels, not boxed inner buttons.
- Tabbed dialog close controls sit on the top-right border so the bottom edge stays clear for tabs.
- Tabbed popups put tabs below and outside the bordered dialog, with the same stroke as the popup.
- True tab buttons reuse the bottom room tabs' normal and selected frame backgrounds. Use the shared selected-tab state so every tab has explicit selected and unselected views; do not assign tab semantics to previous/next pager buttons.
- Standard tabbed popups use `--style-tabbed-dialog-width` on the panel and `260px` content width on the dialog. Wider `286px` dialogs must use the wider panel token too; never mix a standard tab panel with a wider dialog.
- Tabbed dialogs keep a fixed bordered panel height; overflowing tab content scrolls inside that panel and uses a logs-style progress rail below the scroll frame, not inside the rows.
- Every scrollable dialog pane should opt into the shared scroll cue rail; keep the rail below the scroll frame with the same `--style-scroll-progress-gap` and bottom padding rhythm as the select recipe dialog.
- Popup rows should keep stable DOM nodes during snapshot updates so mobile taps do not miss after touchend.
