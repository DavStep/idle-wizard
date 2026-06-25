# Garden Page

The Garden is the room page between Brewing and Workshop.

It renders a compact garden world of plot boxes for open plots plus the next buy slot, the world event entry point, and the seed picker popup. Seed and herb catalog inventories live outside this page for now. Gameplay rules stay in `src/gameplay/garden`: the page only calls buy, plant, replace, and harvest actions and displays their snapshots.
