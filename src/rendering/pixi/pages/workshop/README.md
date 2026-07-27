# Retained Pixi Workshop Page

`WorkshopPixiPage` builds the request panel, summon control, side feature
openers, bag/stats actions, and reward-flyout layer once. The compact world
chat preview belongs to retained global chrome so it stays visible across room
changes.
Requirement rows, feature openers, dialog rows, tabs, and flyouts are keyed and
pooled.

Workshop gameplay and backend behavior remain in presenters/facades. The Pixi
view consumes already-formatted task rows, summon state, feature state, chat
preview, flyouts, and dialog models. It invokes supplied actions without
calculating costs, rewards, unlock levels, inventory, alliance state, or event
progress.

Every side-control model supplies `side` and `weight`. `WorkshopPixiPage`
independently sorts the visible left and right controls, packs each side from
the shared top anchor into fixed slots, and owns the short enter, exit, and
slot-shift transitions. Hidden controls never reserve a row.

Workshop-owned dialogs are registered lazily as `workshop.<feature>` in the
injected `DialogRegistry` and retain their display trees after close.

Pass the shared `PixiInputRouter` when constructing the page. Buttons, hold
summoning, scrolling, dialog backdrops, Escape/Android back, and modal blocking
register once through that router; their registrations are removed only when
the retained view is destroyed.
