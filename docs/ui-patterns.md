# UI Patterns

Use this file to record repeated interface choices. Before adding new UI, check for a similar pattern here and reuse it.

## Box Construction

- Ordinary room boxes use `2px` black borders, compact padding, and no shadow.
- Box titles sit embedded over the top border on the white surface.
- Secondary border labels, such as counts, close/current controls, actions, and tabs, use smaller normal-weight text centered on the border line.
- Popup/dialog boxes use the thicker dialog treatment: `2px` border, `20px` padding, and bottom-right shadow.

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
- Buy/place/claim prices stay right-aligned and use tabular numerals.
- Disabled or locked right-side actions use muted text and keep the same row height as enabled rows.

## Expandable Boxes

- Collapsed boxes keep one full summary row visible inside the box.
- Use a top-right border label for count or progress, such as `2/5`.
- Use a bottom-center border label as the toggle: `expand` when collapsed, `collapse` when open.
- Expand hidden rows in normal flow inside the same box, without overlaying nearby panels.
- Workshop tasks are the exception: reserve only the collapsed task slot in normal flow, then let the expanded box overlay lower Workshop content so `mana sphere` and action controls do not move.
- Notification dots may appear on `expand` when hidden rows need attention, but never on `collapse`.

## Popup Structure

- Dialog titles are embedded border titles.
- Close controls sit as normal-weight border labels, not boxed inner buttons.
- Tabbed popups put tabs below and outside the bordered dialog, with the same stroke as the popup.
- Tabbed dialogs keep a fixed bordered panel height; overflowing tab content scrolls inside that panel and uses a logs-style progress rail below the scroll frame, not inside the rows.
- Popup rows should keep stable DOM nodes during snapshot updates so mobile taps do not miss after touchend.
