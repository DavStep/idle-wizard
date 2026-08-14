# Retained global chrome

The top panel, compact world chat, and bottom room tabs are constructed once
after Pixi assets load. `bind` updates visible values and mutable actions in
place. Input and semantic-target registrations are installed only in
constructors and are removed only during application shutdown.

`PixiBottomRoomTab` is the reusable production widget for one room tab.
`PixiBottomPanelView` retains and arranges those widget instances as the bottom
navigation group. UI Lab mirrors that boundary: the group lists named room-tab
children, and the standalone room-tab entry exposes the widget's internal
frame, icon, label, lock, and notification atoms.

Coordinates are source UI units (`360 × 723.333…`) and preserve the current
DOM chrome anchors: top panel `16/9/328`, content begins at `104`, and room
tabs sit `23` units above the bottom edge. World chat stays directly above the
tabs on every active room after its level gate unlocks. Its two clipped preview
rows retain player avatar, alliance tag, username, level, and body color roles;
system rows omit the avatar and use the active theme's system sender color.

The retained top-panel background uses the less-rounded sibling of the inactive
room-tab nine-slice, flips it vertically, and spans source x `0…360` from
y `0…88`. Room content begins at y `104`, preserving a `16px` separation below
the panel. The retained HUD root starts at source `10.67/10.67`; the reference
export's extra `36px` source notch offset is omitted because the canvas already
starts below `safe-area-inset-top`. The external safe strip and Android status
bar use the panel's `#242938` center color.
