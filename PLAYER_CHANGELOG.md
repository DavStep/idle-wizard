# Player Changelog

Add the newest release at the top before posting a player APK. The Discord APK
upload script posts the section whose heading matches `package.json` `version`.

## 0.2.17

- Rebuilt the latest APK under version 0.2.17 so Android devices and Discord testers can identify the newest build.

## 0.2.16

- Added weekly world notices in the Workshop with normal action requests, gold donations, rewards, and past notice history.
- Improved Workshop personal task rows and chat sending so progress reads cleaner and sent messages appear locally while the server echo catches up.
- Made Garden planting and emptying easier by letting plantable or active plot bodies respond, with clearer empty-plot confirmation copy.
- Tightened Brewing recipe and notification states, and hardened save syncing so compact task/notice data stays under the server save limit.

## 0.2.15

- Improved first-run account setup so connecting an account happens before the game creates a new anonymous save.
- Made ready Garden plants harvest when tapping the plant art, not only the row action label.
- Kept world and alliance chat send errors visible until the player edits the message or changes tabs.
- Tightened prestige and chat dialog spacing so ruby rewards and popup panels read cleaner on mobile.

## 0.2.14

- Added a prestige points tab so permanent capacity rewards are easier to track.
- Improved world chat level syncing so unlocked chat sends are less likely to be rejected after local progress changes.
- Tightened prestige popup tab layout and point reward rows for clearer mobile reading.

## 0.2.13

- Added personal daily and weekly tasks in the Workshop with automatic gold and crystal rewards.
- Added permanent capacity research so prestiges can unlock more Garden plots and Brewing cauldrons.
- Expanded Garden plot and Brewing cauldron purchase tracks for late-run growth.
- Improved world chat sending so player level sync is flushed first and chat errors report more clearly.

## 0.2.12

- Added seed inventory drag-and-drop so seeds can be dragged onto growing Garden plots to swap crops.
- Added a Garden swap confirmation popup that returns the old seed and restarts the plot with the new one.
- Improved Garden seed and herb inventory boxes with compact counts, expand/collapse controls, and smoother scrolling.
- Hid the FPS display from production builds so release APKs keep the game screen cleaner.

## 0.2.11

- Added a compact Garden box view with plant icons, growth motion, harvest cues, and a rows/boxes setting.
- Added Market stand quantity marking so NPC auto-sell can sell all items or only a chosen amount.
- Improved Android auth token storage so signed-in sessions survive WebView storage loss more reliably.
- Retuned later level seed requirements and tightened Elara's Market gold guidance around fast-sell tabs, quantity, and sell targets.

## 0.2.10

- Improved NPC market auto-sell so backend prices stay retained while stands are active and pending sales resume when price data returns.
- Added player market request matching so other players' requests can be filled from an empty stand with quantity controls.
- Tightened Market, Brewing, and alliance notification dots so they point at claimable or directly useful actions instead of generic affordable rows.
- Cleaned potion coloring, empty stand labels, and trade alliance quest reward states for clearer mobile screens.

## 0.2.9

- Simplified Brewing so finished bottles enter inventory automatically, with auto-bottle research covering the full flow.
- Kept early Market demand and prices fake until level 4, then switched to the real shared NPC market.
- Improved Market tab notification dots and NPC stand value labels so sell rows show stack totals more clearly.
- Polished alliance quests, player info, seed drop preference controls, and wizard character art for steadier mobile play.

## 0.2.8

- Added automatic seed summoning controls with an optional mana reserve.
- Added seed drop preferences and a clearer Workshop summoning popup for tuned seed odds.
- Improved reward flyouts, player info popups, and character portrait loading for steadier mobile UI.
- Hardened backend save sanitation and maintenance cleanup around automation, seed preferences, and player data.

## 0.2.7

- Added a Workshop drop-chance popup so researched seed odds can be checked before summoning.
- Added item-buy reward drops for NPC stock and player market purchases, with capped visuals for large stacks.
- Improved mobile tap handling for Garden seed selection, Workshop rewards toggles, Market slot picks, and follow-up click suppression.
- Cleaned top-panel portrait spacing so player status stays readable with larger character icons.

## 0.2.6

- Added character portraits to player info popups and cleaned portrait plus alliance tag order in leaderboard and chat labels.
- Improved world chat and alliance chat send failures so locked chat, maintenance, account-in-use, and offline states show clearer status text.
- Tightened mobile summon feedback and stacked reward notices, and kept fast-sell controls visible but disabled until an item is selected.

## 0.2.5

- Improved character portrait icon assets so Account, chat, leaderboard, and alliance views load smaller images.
- Trimmed some late potion icon atlas entries so the game package stays lighter.
- Hardened release checks and tutorial placement stability so APK builds are less likely to ship with broken guide positioning.

## 0.2.4

- Added selectable player character portraits in Account settings and the top panel.
- Show player portraits in world chat, alliance chat, and leaderboards when icons are enabled.
- Added icons for newly revealed potion names so later potion rows no longer fall back to generic art.
- Improved Workshop summon feedback with stacked reward notices and visible mana spend text.
- Added daily NPC market demand tracking on the backend for future market balancing.

## 0.2.3

- Raised the playable level cap to 100 with new level requirements and backend config support.
- Added local haptics and UI sound settings, plus tap feedback for mobile controls.
- Improved server reconnect/account-in-use handling so the game blocks stale taps and offers a clearer `play here` action.
- Tuned NPC market pricing, demand recovery, and auto-sell timing so prices and stand timers stay more consistent.
- Smoothed page swipes, Workshop requirement sorting, Brewing guide rows, and Elara tutorial targeting.

## 0.2.2

- Made holding the Workshop summon seed button repeat summons while mana is available.
- Moved the NPC market sell timer into one shared label so stand rows stay cleaner.
- Improved Google sign-in callback handling and world chat send feedback on mobile.

## 0.2.1

- Fixed mobile taps that could make popups open and close immediately after pressing a button.
- Made touch press feedback clear more reliably, including the Workshop summon seed button.

## 0.2.0

- Added the first Pixi-backed rendering layer and asset atlas path so future visuals can run smoother on mobile.
- Upgraded Elara's pointer guidance with animated Spine support and steadier placement around targets.
- Added item icon labels across rooms for clearer seeds, herbs, potions, and resource rows.
- Improved mobile press feedback, task progress fills, and tutorial guide movement so taps and guidance feel more responsive.

## 0.1.28

- Smoothed Elara's objective collapse and lesson hide motion so guide transitions feel cleaner on mobile.
- Tuned tutorial reward burst timing for a sharper but less distracting guide feedback effect.

## 0.1.27

- Added buyable extra Brewing cauldrons so potion work can expand through player progress instead of appearing all at once.
- Made early herb growth faster and tightened Workshop level-up requirements so the first loops move more clearly.
- Improved Workshop requirement labels and guide connections so level goals show what they unlock and where to act next.
- Hardened Elara's tutorial targeting around Brewing, Market, Garden, and level-up steps, with steadier pointer placement and mobile tap handling.

## 0.1.26

- Tightened Elara's Market and level-up guidance so later gold goals stay locked onto the real fast-sell flow, selected items, and amount step.
- Kept tutorial-owned Market prices visible during FTUE so sell and buy quotes match lesson goals instead of drifting with live NPC values.
- Smoothed early progression by shortening the first sage seed task and putting the level 2 sage herb task before the sage seed follow-up.
- Made Market touch targets more reliable on mobile for demand, locked stand buys, and stand item selection.

## 0.1.25

- Added public alliance popups from alliance tags and alliance rows, with member roles and quick join/apply actions where allowed.
- Linked player info popups into those alliance details so it is easier to inspect who is in each group.
- Updated Elara's Market lesson to use the real fast-sell flow, including the item target and final sell confirm.
- Hardened tutorial capture around fresh-start and direct-sell steps so release screenshots stay in sync with live FTUE behavior.

## 0.1.24

- Swapped Elara's target cue back to the plain pointing hand so guidance stays cleaner and easier to read.
- Removed the Spine pointer runtime path and kept the small hand nudge in CSS for steadier tutorial prompts.

## 0.1.23

- Improved Elara's early guide so saving the default name counts, fast sell points at the real confirm flow, and sage-grow wait states keep the lesson alive.
- Reworked Elara's pointer cue for steadier motion and better visibility on mobile.
- Made summon reward drops anchor more cleanly to the room stage on scaled screens.
- Reduced background loading for Market listings, alliances, and leaderboard popups until those views are opened.
- Tightened save syncing and crystal backfill so reloads are less chatty and in-progress crystal research stays accounted for.

## 0.1.22

- Made early Workshop tasks shorter and sage growth faster so the first levels move better.
- Updated Elara's Garden lesson to guide three sage grows, then the sage seed and sage herb tasks.
- Made Elara wait a few seconds before pointing during lesson 3, so target prompts feel less pushy.
- Improved Market fast sell with full-row item taps and a clearer selected item summary.
- Turned resource icons on by default for new players.

## 0.1.21

- Raised player progression to level 44 with new task goals, level costs, and research gates.
- Added fast sell in Market, with ruby research that improves manual NPC sell payouts up to 95%.
- Reworked NPC market auto-sell around one shared timer that sells eligible selected item stacks.
- Retuned seed, recipe, summon, task, and level balance for the longer progression curve.
- Updated Elara's early Market guide to use fast sell and made garden crop guidance steadier.

## 0.1.20

- Added player info popups from visible player names in chat, leaderboards, alliances, and market history.
- Added prestige announcements to world chat.
- Made auto brewing remember separate recipe and on/off settings for each cauldron.
- Improved NPC market selling with longer sell timers, bulk sales, and visible countdowns.
- Kept Elara's guide steadier around blocking popups and target pointers.

## 0.1.19

- Improved Elara's first lesson with a clearer intro, username setup, and a personal greeting before mana guidance.
- Kept early guide focus steadier by keeping the top panel visible after it is introduced and by skipping old guide steps after prestige.
- Made Workshop tasks cleaner when only one task is active, while keeping expand/collapse for multi-task levels.
- Fixed the Market guide step so it waits for the sell picker before asking players to choose a seed.
- Fixed leaderboard and alliance income growth after prestige so new-run earnings keep counting.

## 0.1.18

- Renamed the first-time guide to Elara Starbrew across prompts and objective labels.
- Made Elara's guide text faster while keeping action labels readable immediately.
- Added subtle Elara speaking motion and a softer control reveal when the game surface loads.
- Reset first-time guide progress correctly for fresh empty saves after progression resets.
- Improved tutorial pointer and timer cleanup for steadier guide behavior.

## 0.1.17

- Rebuilt the latest APK under version 0.1.17 so devices can identify the newest build.
- Added colored trade alliance tags in alliance views, chat, and leaderboards.
- Improved level 3 Mira guidance so it continues through mint seed, mint herb, and level-up tasks.
- Smoothed later task requirements so level tasks follow research order more clearly.
- Added clearer gold collection flyouts and fixed first-run account choice gate behavior.

## 0.1.16

- Added colored trade alliance tags in alliance views, chat, and leaderboards.
- Improved level 3 Mira guidance so it continues through mint seed, mint herb, and level-up tasks.
- Smoothed later task requirements so level tasks follow research order more clearly.
- Added clearer gold collection flyouts and fixed first-run account choice gate behavior.

## 0.1.15

- Improved Mira's objective button and early guide flow.
- Kept level 3 progression smoother by locking nettle seed research until level 4.
- Made task rows and reward drops more stable and readable on mobile.

## 0.1.14

- Reworked Mira's first-time guide with clearer objectives and progress.
- Made early task goals smoother around the first few levels.
- Improved APK release posts with a player changelog.

Example:

```md
## 0.1.14

- Added easier garden controls.
- Fixed Google sign-in getting stuck after account selection.
```
