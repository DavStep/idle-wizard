# Brewing Page

Brewing is the left edge room page, immediately left of Garden.

Nine restrained warm fireflies drift through the passive room scenery behind
the cauldron and controls. Their motion is page-scoped and transform-only, with
a dim static constellation for reduced-motion players and lower intensity in
Day.

It renders a pannable brewing world, cauldron nodes, bottom icon buttons that expand inline herb and potion boxes, a recipe-only selection dialog opened from the current cauldron, the next buyable cauldron, brew and bottle actions, navigation, and the bottom page name.
The Recipes dialog uses sentence-case player copy: its title, potion and ingredient names, descriptions, navigation, status, and action labels start with uppercase letters.
Tapping the active cauldron during brewing or bottling removes up to one second
from its timer, with the same per-target cooldown used by Garden plots.
A potion automatically granted after bottling plays the same short pop used by
manual seed summoning.
It does not own potion recipes, brewing costs, brew timers, inventory changes, effects, or progression rules; those stay in `src/gameplay/brewing/`.
