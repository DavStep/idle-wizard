# Player Info Backend

Subscribes to the bounded public `player_info_summary` view so UI can show a compact profile for players already visible in social surfaces. It exposes display-only social/profile fields: username, character, alliance tag, total produced coin, total brewed potions, total harvested herbs, level, prestige count, online/last-seen state, and server-counted playtime.

Playtime accumulates only while the account owns an active server connection. Disconnect and session-takeover boundaries settle the elapsed interval; an open profile also includes the current unsettled interval so the displayed hours are current when the dialog opens.
