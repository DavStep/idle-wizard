# Garden Page

The Garden is the room page between Brewing and Workshop.

Nine warm fireflies drift through the passive room scenery behind the plots and
controls. Their motion is page-scoped and transform-only, with a dim static
constellation for reduced-motion players and lower intensity in Day.

It renders open plots plus the next buy slot inside the shared bounded vertical scroll pane. The plot list stays at a fixed scale, rejects horizontal pan and pinch zoom, and only scrolls when its rows overflow the available room area. The retained Garden action bar sits above World Chat with `Seeds`, a compact selected-seed tool, and researched `Plant All` and `Harvest All` actions. The available actions divide the row evenly, so only `Seeds` is shown before either bulk-action study, two actions appear after `Plant All`, and all three appear after `Harvest All`. Seed selection is page-level: selecting a seed from the list closes the dialog, tapping an empty plot plants it when enough stock exists, and tapping an unavailable empty plot shows the shared `no seed` flyout without adding a plot label. Tapping a growing plot offers to swap crops. Gameplay rules stay in `src/gameplay/garden`: the page only calls buy, plant, replace, and harvest actions and displays their snapshots.

A successful tap on an empty plot plants the selected seed and plays the Garden
planting cue. A successful tap on a ready plot starts its harvest timer and
plays the same short pop used by manual seed summoning. Both use the device-local
`sfx` preference and replace the generic click sound for those plot actions.
Tapping a growing or harvesting plot reduces its active timer by one second,
then locks that plot for the complete 720ms feedback sequence. A selected seed
that differs from the growing crop still opens the intentional swap
confirmation. Rejected taps stay silent and do not restart feedback.
