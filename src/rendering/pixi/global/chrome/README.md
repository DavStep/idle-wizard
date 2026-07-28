# Retained global chrome

The top panel, compact world chat, and bottom room tabs are constructed once
after Pixi assets load. `bind` updates visible values and mutable actions in
place. Input and semantic-target registrations are installed only in
constructors and are removed only during application shutdown.

Coordinates are source UI units (`360 × 723.333…`) and preserve the current
DOM chrome anchors: top panel `16/9/328`, content begins at `104`, and room
tabs sit `23` units above the bottom edge. World chat stays directly above the
tabs on every active room after its level gate unlocks.

The retained top-panel background uses the less-rounded sibling of the inactive
room-tab nine-slice, flips it vertically, and spans source x `0…360` from
y `0…120`. Room content begins at y `136`, preserving a `16px` separation below
the panel. The retained HUD root starts at source `10.67/10.67`; the reference
export's extra `36px` source notch offset is omitted because the canvas already
starts below `safe-area-inset-top`. The external safe strip and Android status
bar use the panel's `#242938` center color.
