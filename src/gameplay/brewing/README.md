# Brewing

Brewing stages owned herbs in cauldron order, spends mana, and starts one active brew.
Known recipes require matching ingredient order and completed recipe research.
Unknown mixes brew into wasted potion, which uses the default wasted brew balance.
Cauldron slots are bought with gold up to the current progression cap. Level milestones unlock the first 5 caps before prestige, then permanent advanced capacity research unlocks cauldrons 6-10 after enough completed prestiges and makes the researched cap buyable immediately in that run. Milestones and research do not grant extra cauldrons for free.
An active brew runs through brewing, waits for a bottling action, then bottling; inventory changes automatically when bottling ends.
Auto brewing stores an enabled flag plus one selected unlocked recipe key per cauldron. Automation prepares that cauldron's recipe from inventory before starting the brew.
The Brewing snapshot exposes all recipes with their unlock state so pages can show a read-only recipe book without duplicating recipe catalog rules.
