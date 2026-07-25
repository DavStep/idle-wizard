# Retained global chrome

The top panel, compact world chat, and bottom room tabs are constructed once
after Pixi assets load. `bind` updates visible values and mutable actions in
place. Input and semantic-target registrations are installed only in
constructors and are removed only during application shutdown.

Coordinates are source UI units (`360 × 723.333…`) and preserve the current
DOM chrome anchors: top panel `16/9/328`, content begins at `104`, and room
tabs sit `23` units above the bottom edge. World chat stays directly above the
tabs on every active room after its level gate unlocks.
