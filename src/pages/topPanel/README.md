# Top Panel

The top panel is shared room UI. It shows player name, mana, coin, and crystal above each page.

Use two compact rows: the avatar spans the left side, while username and level sit on the first text row and open settings. Settings contain username editing, the old report tab for feedback/bugs/features, and the configurations tab for device toggles, visual theme, font, and progress bar. Pressing the top-panel avatar opens the avatar picker directly. Device toggles such as haptics, music, and sfx stay device-local. Visual option names select researched options only. The right-side price/status label, including `free`, researches unresearched options; after that the name can select the option. Mana, coin, and crystal share the second row. Mana also shows a small `+n/s` regen line under the current amount. Shrink that row's source font only when resource text would clip. Keep it plain with the ordinary `1px` panel treatment.
