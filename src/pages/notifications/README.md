# Page Notifications

Turns existing snapshot action flags into shared red/orange notification badges.

The feature does not own gameplay. It reads room snapshots, marks actionable
children, and rolls them up to the bottom room tabs. DOM and retained-Pixi
surfaces use the same sprite, size, and slightly-outside top-right anchor.
Bottom room-tab badges remain visible while the tutorial filters unrelated
in-room badges, including when the notified room is selected.

Summon seed is noisy if it marks every affordable summon forever. Keep it red as
soon as affordable through level 2, then show it only as an orange low-priority
dot when mana is capped.

Alliance notifications remain actionable: a claimable weekly quest reward or a
pending join request visible to Factor-or-higher managers marks the Alliance
landmark and rolls up to Workshop. Request rows are retained separately from
the full public alliance directory so Browse data stays popup-scoped.
