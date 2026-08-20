# Automation

Automation turns advanced research into repeated seed, garden, and cauldron actions. Each numbered plot study owns both planting and harvesting for that plot. Each numbered cauldron study owns both brewing and bottling for that cauldron.

The facade observes other gameplay facades and runs after normal timers each ECS tick. Research only unlocks automation; garden, brewing, inventory, mana, and logs still own their own rules.

Each researched Garden plot has a persisted Auto toggle. Its per-plot future
seed and selected `xN` quantity remain owned by the Garden ECS/save; automation
only checks the toggle, harvests ready crops, and asks Garden to plant the next
empty cycle.

Prestige 4 unlocks improved auto summon reserve controls in the standing-orders popup. Emerald automation reserve studies refine those controls by adding reserve presets and larger step buttons, but they still write through the same mana reserve setting.
