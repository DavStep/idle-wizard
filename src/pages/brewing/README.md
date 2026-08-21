# Brewing Page

Brewing is the left edge room page, immediately left of Garden.

Nine restrained warm fireflies drift through the passive room scenery behind
the cauldron and controls. Their motion is page-scoped and transform-only, with
a dim static constellation for reduced-motion players and lower intensity in
Day.

It renders a pannable brewing world, cauldron nodes, bottom icon buttons that expand inline herb and potion boxes, a recipe-only selection dialog opened from the current cauldron, the next buyable cauldron, brew and bottle actions, navigation, and the bottom page name.
The compact recipe selector beside `Empty` shows enlarged selected-potion art
that may rise above the button face and a name that wraps to two lines when
needed. It remains available while a batch is brewing or bottling so the player
can choose that cauldron's next recipe without changing the active batch. The
new recipe takes over after the active batch is granted; researched Auto Brew
then continues with that saved recipe when enabled.
The Recipes dialog uses sentence-case player copy: its title, potion and ingredient names, descriptions, navigation, status, and action labels start with uppercase letters.
Known locked recipes show the passive `Not researched` status on the shared
Bag-row background. While that recipe is being studied, the same status reads
`Researching: <time left>` and counts down; research remains owned by the
Research room.
Unknown recipes have no action. They hide recipe details, tint the paper with
the shared locked overlay treatment, center the shared lock slightly above the
page midpoint, and pin a passive `Recipe not yet discovered` status to the
bottom on the same Bag-row background.
Tapping a research-locked next cauldron opens its exact capacity study in
Research. Tapping a missing recipe ingredient opens the herb picker, centers
that exact herb row, and gives it one short attention boink. A brew request
opens the Recipes book directly to its required potion card and boinks the
card's existing action control.
Tapping the active cauldron during brewing or bottling removes at most one second from the remaining time
from its timer, with the same per-target cooldown used by Garden plots.
A potion automatically granted after bottling plays the same short pop used by
manual seed summoning.
It does not own potion recipes, brewing costs, brew timers, inventory changes, effects, or progression rules; those stay in `src/gameplay/brewing/`.
