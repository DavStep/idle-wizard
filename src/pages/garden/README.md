# Garden Page

The Garden is the room page between Brewing and Workshop.

It renders the garden plot as compact text rows for open plots plus the next buy row, a read-only `herbs` inventory block under the plot, plus a seed picker popup. Gameplay rules stay in `src/gameplay/garden`: the page only calls buy, plant, and harvest actions and displays their snapshots.
