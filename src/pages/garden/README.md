# Garden Page

The Garden is the room page between Brewing and Workshop.

It renders the garden plot as compact text rows for open plots plus the next buy row, a draggable `seeds` inventory, a read-only `herbs` inventory block, plus a seed picker popup. Seed and herb inventory boxes collapse to three rows and keep their expand/collapse state while moving between room tabs. Gameplay rules stay in `src/gameplay/garden`: the page only calls buy, plant, replace, and harvest actions and displays their snapshots.
