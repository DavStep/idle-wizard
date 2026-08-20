# Brewing

Brewing stages owned herbs in cauldron order, spends mana, and starts one active brew.
Each cauldron accepts up to six staged ingredients; every occupied slot holds
exactly one herb and recipes may use fewer than six slots. Repeated herbs are
stored as repeated ordered recipe slots.
Known recipes require matching ingredient order and completed recipe research.
Unknown mixes brew into wasted potion, which uses the default wasted brew balance.
The first player to discover a hidden recipe keeps it learned across Prestige.
Once discovered, the named recipe becomes independently researchable for other
players instead of becoming globally learned.
Cauldron slots are bought with coin up to the current progression cap. Level milestones unlock the first 2 caps before prestige, then permanent advanced capacity research unlocks cauldrons 3-5 after enough completed prestiges and makes the researched cap buyable immediately in that run. Milestones and research do not grant extra cauldrons for free.
An active brew runs through brewing, waits for a bottling action, then bottling. Finishing the bottling timer automatically grants the whole produced batch and clears the cauldron; `ready` remains only as a transient compatibility phase for older saves. Cancelling during brewing or bottling destroys the unfinished output, does not refund herbs or mana, and disables autobrew for that cauldron.
Every potion recipe owns its configured brew duration. Regular per-potion mastery reduces that duration independently in five-percentage-point ranks, then advanced per-cauldron research applies to the result. Mana Tonic starts at the previous `30s`; early potion uplifts ramp by tier before later recipes use the full `85%` uplift.
`BrewingTapAccelerationManager` owns manual cauldron acceleration. Each accepted
tap removes at most one second from that cauldron's brewing or bottling timer,
then locks that cauldron for the same 720ms feedback window used by Garden plots.
Auto brewing stores enabled, armed, and the selected unlocked recipe independently for every cauldron. Enabled Auto Brew waits for its selected recipe's herbs and mana and starts as soon as they become available; completed bottling uses the same automatic grant as manual brewing so the automation loop can continue. The armed state records that the loop has completed its first successful start; it does not block an enabled cauldron from waiting for resources. Legacy auto-collect save fields remain compatible but no longer affect collection. The save uses the numbered cauldron array, so additional cauldron slots inherit the same persistence behavior without slot-specific fields. Automation prepares that cauldron's recipe from inventory before starting the brew.
The Brewing snapshot exposes all recipes with their unlock state so pages can show a read-only recipe book without duplicating recipe catalog rules.
