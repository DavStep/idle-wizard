# Garden Page

The Garden is the room page between Brewing and Workshop.

It renders a compact pannable garden world of plots for open plots plus the next buy slot. The retained Garden action bar sits above World Chat with `Harvest All`, `Seeds`, and a compact selected-seed tool. Seed selection is page-level: selecting a seed from the list closes the dialog, tapping an empty plot plants it when enough stock exists, and tapping an unavailable empty plot shows the shared `no seed` flyout without adding a plot label. Tapping a growing plot offers to swap crops. Gameplay rules stay in `src/gameplay/garden`: the page only calls buy, plant, replace, and harvest actions and displays their snapshots.
