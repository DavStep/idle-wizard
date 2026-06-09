# Brewing

Brewing stages owned herbs in cauldron order, spends mana, and starts one active brew.
Known recipes require matching ingredient order and completed recipe research.
Unknown mixes brew into Wasted Potion, which uses the default wasted brew balance.
An active brew runs through brewing, waits for a bottling action, then bottling, then ready-to-collect phases; inventory changes only when the ready potion is collected.
The Brewing snapshot exposes all recipes with their unlock state so pages can show a read-only recipe book without duplicating recipe catalog rules.
