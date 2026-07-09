# Player Changelog

Add the newest release at the top before posting a player APK. The Discord APK
upload script posts the section whose heading matches `package.json` `version`.

## 0.2.80

- Fixed Android account connection releases by keeping APK signing on the current account-compatible certificate while using a smaller release build for uploads.

## 0.2.79

- Added automatic world event reward settlement so qualified rankings send inbox rewards after an event period ends.
- Made inbox reward claiming safer by saving granted rewards before the server marks mail collected.
- Fixed server save cleanup so active next-level task progress is preserved across save reloads.
- Polished Workshop stats, inbox rewards, Guild request posting, Brewing cauldron actions, and shop buy labels with clearer icons and tighter layouts.

## 0.2.78

- Reworked the earliest level requirements so new wizards build toward level 1 with a fuller sage seed task and coin step.
- Improved Elara's early tutorial with clearer mana, task, and unlock highlighting, plus safer timing around room announcements.
- Added clearer level-up and room-unlock announcements with room icons and more readable reward labels.
- Added more selectable adventurer portraits and kept the server visual-settings list in sync.

## 0.2.77

- Fixed duplicate empty accounts appearing in world event rankings by waiting for the account save to load before shared score syncs can publish.
- Hardened the server so pre-save identities cannot publish generated coin or world event points to public leaderboards.

## 0.2.76

- Added a Workshop stats popup for lifetime seeds, herbs, potions, NPC trade coin, player trade coin, and potion royalty coin.
- Replaced the old Workshop ledger shortcut with a clearer `stats` button and tabbed history view.
- Improved Brewing cauldron controls so recipe, batch, auto-brew, and locked actions stay visible with clearer labels.
- Tightened mobile/web interaction styling by removing hover-only emphasis and keeping action states readable across room controls.

## 0.2.75

- Rebalanced level tasks into clearer decade pacing, with relief after each major wall and stronger checkpoints before the next stretch.
- Added potion discovery royalty history so while-away reports can show royalty coin earned from other players' NPC potion sales.
- Improved while-away market reports with clearer rows for traders, player purchases, request fills, and royalty income.
- Added distinct research completion icons for automation, Garden, Brewing, fast sell, and research upgrade families.

## 0.2.74

- Added a while-away report so returned players see produced items and NPC market sales from time spent out of the app.
- Reworked level requirements to track research, summoning, growing, brewing, selling, and turn-ins, with refreshed task balance through the level curve.
- Expanded prestige rewards with clearer milestone inclusion, point rewards, an extra research slot unlock, run focus, and stronger automation reserve controls.
- Added the Workshop ledger, improved inbox/alliance side buttons, and polished Research, Prestige, and Brewing panels for cleaner mobile readability.

## 0.2.73

- Made the first Workshop entry and level 1 task free so new wizards reach the first level-up faster.
- Rebalanced early level requirements and research costs/timers through level 10 for a smoother Market, Research, Garden, and Brewing ramp.
- Updated Elara's tutorial flow to use normal fast-sell behavior, introduce Research before Garden, and guide Brewing from mana tonic research.
- Polished Workshop shortcut buttons with mail, leaderboard, and discoveries icons, plus cleaner intro and room unlock animations.

## 0.2.72

- Moved wizard name setup out of Elara's first lessons so the early tutorial starts faster and social surfaces ask for a name only when needed.
- Polished the first-run story intro with smoother scene changes, a peaceful-world beat, and clearer reward motion.
- Added Brewing tab art and improved selected bottom navigation frames, icon placement, and label readability.
- Fixed newly saved wizard names so they stay stable while account profile data refreshes.

## 0.2.71

- Added a first-run story intro before Elara's lessons so new wizards get the workshop setup before play begins.
- Made Midnight the default visual theme and removed the old white theme from the settings choices.
- Added more bottom navigation art for Workshop, Garden, Research, and Market while keeping the room tabs readable.
- Fixed fresh-start and account-link flows so the intro and tutorial reset together for new empty saves.

## 0.2.70

- Added telescope art to the Research tab while keeping the bottom navigation height stable.

## 0.2.69

- Improved Elara's early Garden guidance so she gives clearer next steps for summoning, planting, waiting, and harvesting sage.
- Kept tutorial target pointers aligned while nearby panels expand or collapse.
- Polished Midnight theme frames and Workshop level reward labels for cleaner mobile readability.

## 0.2.68

- Rebalanced Garden and Brewing capacity so the first prestige rewards unlock extra plots and cauldrons sooner through capacity research.
- Preserved older saves with extra plots or cauldrons by converting those slots into the matching completed capacity research.
- Improved prestige resets so the next run starts with the earned crystal for its reset level while daily and weekly task progress keeps its normal timer.

## 0.2.67

- Improved Elara's early lessons with short checkpoint prompts after the first task, sale, harvest, research, and brew.
- Polished first-run onboarding copy so Elara introduces the account choice more clearly.
- Cleaned up Workshop reward labels, tutorial placement, and framed button art for a sharper mobile view.

## 0.2.66

- Polished Midnight theme buttons and bottom tabs so normal, selected, and locked states use the cleaner framed surfaces.

## 0.2.65

- Improved Elara's level 2 guidance so she asks players to pin the level requirements before moving on to Garden or more seed summoning.
- Polished the first fast-sell lesson so the selected amount is highlighted clearly without an unnecessary pointer.
- Fixed Midnight bottom navigation chrome so the tab bar wrapper stays transparent while the room tabs keep their framed button surfaces.

## 0.2.64

- Improved Elara's early guide placement so lesson panels avoid covering the summon target and nearby tutorial controls.
- Polished Midnight theme panel borders so framed player panels render cleaner.

## 0.2.63

- Fixed connecting a new account with no previous save so it starts a fresh game immediately after login instead of asking to start new again.
- Updated the first-run account choice title to show the game name more clearly.

## 0.2.62

- Fixed first-run start/account choice screens so the room UI no longer appears behind them before the game is ready.
- Improved the fresh-start gate backdrop and Elara portrait sizing so the pre-game choice reads cleanly on mobile.

## 0.2.61

- Moved mail into the Workshop action buttons so inbox access and notifications stay near the main room actions.
- Improved Elara's Garden guidance so players stay in Workshop until they have a usable sage source, then move to Garden at the right moment.
- Fixed first summon guidance so it updates as soon as mana reaches the summon cost, even between full gameplay refreshes.
- Fixed new Google account links with no server save so they start fresh and reset the tutorial instead of carrying over the previous device progress.

## 0.2.60

- Added matching automation, speed, and emerald upgrade research rows for capacity-unlocked plots and cauldrons after prestige.
- Fixed research balance defaults so older server configs can fill in missing crystal costs for newly available automation rows.
- Improved Elara's early Market fast-sell guidance so the selected amount is shown briefly before the guide moves to the sell button.
- Polished Midnight theme panels and buttons with a sharper framed border treatment.
- Hardened server maintenance reset tooling so inbox mail, feedback, event points, and player market requests are backed up, verified, and cleared correctly.

## 0.2.59

- Added a top-panel inbox for system mail, admin gifts, broadcast news, and reward messages with a clear claim button and notification dot.
- Added weekly world event reward mail so qualified event contributors can receive crystal and emerald rewards through the inbox after settlement.
- Reworked Workshop potion discoveries into book-style recipe pages with ingredients, owned counts, discoverer links, royalties, mana cost, brew time, and page controls.
- Improved Garden seed handling so seeds can be dragged from the seed inventory onto plots to plant or swap, with tap controls still intact.
- Fixed NPC demand market recovery so weekly demand resets cleanly at the shared Monday UTC boundary and frontend/backend prices stay aligned.

## 0.2.58

- Fixed Google account connection on web/mobile so unavailable browser login fails cleanly instead of sending players through a broken redirect.
- Improved fresh installs and empty connected accounts so the start-new/account choice stays visible until the player chooses.
- Polished the Workshop summon seed settings with a clearer selected-seed editor, scroll cue, and safer drop-weight choices.

## 0.2.57

- Reworked quests so daily quest completions add points to both daily and weekly reward tracks.
- Added clearer quest and reward tabs with milestone claim buttons and progress bars.
- Improved quest reward notifications and reward flyouts so claimable milestones point to the right reward.
- Polished Garden plot ground art and removed unused image assets from the client build.

## 0.2.56

- Polished Garden plot ground art for base and upgraded plots so the room view reads cleaner.
- Removed an unused chest image from the client build.

## 0.2.55

- Fixed Garden plot views so the world opens centered, stays below the top panel, and keeps upgraded plot art cleaner.
- Improved Garden empty plot taps so plots without a plantable selected seed open seed choices instead of doing nothing.
- Fixed NPC demand auto-sell catch-up so sold-out marked items stop cleanly during timer cycles.
- Shortened level-up and research announcement animations so milestone popups get back to play faster.

## 0.2.54

- Fixed wide desktop Garden and Brewing views so panning space stays aligned with the authored room instead of collapsing at the sides.
- Refined Garden plot ground art and spacing so upgraded plots read cleaner in the room view.

## 0.2.53

- Fixed higher-level Garden plots so x2+ plantings require and show the correct seed count.
- Tightened Garden and Brewing taps so plot seed labels and cauldron action buttons no longer reopen the wrong popup after the same tap.
- Polished Brewing cauldron layout, recipe discovery text, level/prestige panels, player info loading, icon spacing, and native zoom blocking.

## 0.2.52

- Fixed Garden seed switching on WebView so the swap or empty-confirm popup no longer closes from the same tap that picked a seed.
- Tightened Garden plot taps so buy slots survive small WebView finger drift like planting and harvesting already do.
- Improved first-run account status text so failed or cancelled Google login returns explain what happened instead of looking stuck.

## 0.2.51

- Fixed level-up and research completion notices so restored saves do not replay old announcements, and large level jumps keep their unlock lists readable.
- Improved seed visuals across labels, rewards, research notices, and Brewing drag icons with clearer seed pack art.
- Tightened mobile play by disabling native Android WebView zoom, blocking stray pinch gestures in Garden and Brewing, and polishing Garden plot labels/timers.
- Updated recipe discoverer names to open player info, and cleaned up avatar, prestige, and room-tab status icons.

## 0.2.50

- Added full-screen progress notices for level-ups and completed research so big milestones are harder to miss.
- Polished room unlocks, avatar choices, and prestige summaries with clearer lock states and reward previews.
- Improved Brewing and Garden controls with safer pinch handling, clearer recipe discoveries, and auto-brew that waits for a successful manual brew before repeating.

## 0.2.49

- Fixed Garden planting on Android/WebView so empty plots with a selected seed still plant after small finger drift.
- Tightened Brewing touch controls so cauldron taps and herb taps are less likely to be lost on mobile.
- Polished Garden harvest visuals with clearer scissors animation and cleaner plot art.

## 0.2.48

- Improved Brewing herb drag feedback with smoother item motion, clearer count previews, and cauldron receive animation.
- Made brewed potion rewards fly out from the cauldron liquid and tightened potion preview labels/icons.
- Polished ready Garden plots so tapping the plot frame harvests more reliably on mobile without extra label clutter.

## 0.2.47

- Updated the Brewing recipe book so not-yet-researched recipes stay visible, and unknown recipes appear as locked mystery entries until discovered.
- Polished Brewing cauldrons with clearer recipe controls, batch quantity cycling, and colored liquid previews while a potion brews.
- Refined Garden plot art, upgrade stars, tutorial placement, and wide desktop scaling for cleaner room layout.

## 0.2.46

- Added bottom inventory buttons in Garden and Brewing so seeds, herbs, and potions can open as inline room boxes.
- Reworked Brewing cauldrons with clearer recipe, ingredient, potion preview, quantity, and selected-recipe controls.
- Polished Garden plots, star labels, and wide desktop scaling so room UI, tutorial pointers, and world event scrolling stay aligned.

## 0.2.45

- Fixed empty Brewing cauldrons so tapping the cauldron opens its dialog reliably on mobile.

## 0.2.44

- Removed the weekly world event shortcut from the Garden room so the event entry stays on Workshop.
- Polished Garden plot and Brewing cauldron buy slots with clearer locked styling and a brief purchase snap animation.
- Cleaned up Brewing cauldrons so empty cauldrons stay quiet, potion previews use icons, and no-match mixes no longer add an extra `unknown mix` status row.

## 0.2.42

- Maintenance release: rebuilt the Android APK and hosted web client from the latest main branch.
- No gameplay or UI behavior changes from the previous release.

## 0.2.41

- Fixed large inventory stacks so saved seeds, herbs, and potions above the old cap stay intact after reconnecting or reloading.
- Added the weekly world event entry point to the Garden room and removed the old read-only seed and herb catalog boxes from that page.
- Tightened Brewing room layout with a compact two-column herb tray and cleaner cauldron placement.
- Refreshed several adventurer portraits so they render cleaner in cropped mobile views.

## 0.2.40

- Improved Brewing room touch controls so cauldron boxes can start world drag or pinch gestures without opening the cauldron by accident.
- Tightened Brewing world fit and active brew rows so cauldrons and timer rails stay cleanly inside the room view.
- Polished Prestige roadmap and point reward rows so the page uses consistent same-width boxes.
- Refined several character and herb icons so cropped Android views look cleaner.

## 0.2.39

- Smoothed Garden, Brewing, and Research timer bars so progress and remaining-time labels stay in sync between gameplay updates.
- Tuned coin reward flyouts to use lighter animation paths and fewer active particles for steadier Android performance.

## 0.2.38

- Polished star labels for upgraded cauldrons and emerald research, and tightened the Guild secretary and top-panel avatar layouts.

## 0.2.37

- Added batch brewing controls so upgraded cauldrons can brew `x2` and higher amounts when the ingredients and mana are available.
- Updated Garden and Brewing upgrade labels to show star strength and clearer `plant xN` / `brew xN` actions.
- Reduced many mid- and late-game level task requirements, and lowered emerald upgrade costs for extra plots and cauldrons.
- Improved Guild screens with a secretary portrait, clearer resource-colored rewards, and steadier scrolling while boards refresh.
- Made the top-panel avatar open the avatar picker directly, and tightened Elara's pointer target around the username.

## 0.2.36

- Maintenance release: rebuilt the Android APK and hosted web client from the latest main branch.
- No gameplay or UI behavior changes from the previous release.

## 0.2.35

- Tightened mobile tap confirmation so haptics and click sounds only fire after a valid action.
- Improved Pixel/WebView tap tolerance so small finger drift near buttons is less likely to cancel the tap.
- Added a subtle Guild secretary upgrade motion with reduced-motion support.
- Cleaned up world event donation rows and reward icon spacing.

## 0.2.34

- Reworked weekly world events into donation quests that can ask for useful potions or coin, with an amount picker, point preview, and per-option totals.
- Added a new rotation of world-event crises and cleanup so older saved funding events refresh into the current quest format.
- Improved the world event popup with clearer quest rows, fixed header scrolling, leaderboard rewards, and qualification copy.
- Tightened mobile taps for Garden seed choices, Research locked rows, and Market fast-sell rows so scrolling is less likely to select the wrong thing.
- Improved Android keyboard handling, swipe navigation, timer fills, Guild board/adventurer rows, and desktop hover behavior.

## 0.2.33

- Improved Android text handling so normal play no longer opens copy, paste, select, or drag menus over the game.
- Smoothed mobile keyboard behavior so text-entry dialogs and world chat stay positioned more reliably.
- Updated Garden, Brewing, and Research timers with shared stepped progress bars and clearer minute/hour remaining time.
- Replaced underlined selected and hover states with bold text cues across room controls for cleaner mobile rendering.
- Tightened Guild secretary upgrade previews, Guild settings saves, and the Workshop summon repeat timing.

## 0.2.32

- Added live weekly world event leaderboard data so event points and player rows stay synced across clients.
- Changed Guild requests so new requests arrive as choices and players decide which ones to pin to the board.
- Improved Android resume handling so the game saves, pauses, and reconnects more cleanly after backgrounding.
- Tightened tutorial progress text, world event scrolling, Guild layout, and Garden harvest feedback for cleaner mobile play.

## 0.2.31

- Fixed the free coin offer so restarting the app no longer resets its two-hour cooldown after collection.

## 0.2.30

- Clarified weekly world event tasks so each row starts with the real action, like earning coin, selling items, brewing potions, harvesting herbs, or completing research.
- Improved world event popups with cleaner resource coloring, centered leaderboard rows, and fallback player details that use your wizard name and character.
- Moved research time upgrades into Emerald Research so the upgrade group matches its emerald cost.
- Tightened scroll progress rails, Guild charter spacing, Garden seed rows, and Market sell pickers for cleaner mobile layouts.
- Fixed touch-drag and canceled-tap handling so rows and buttons are less likely to fire an accidental action after scrolling or moving your finger.

## 0.2.29

- Added more late-game herbs, potion recipes, market prices, and item icons.
- Added research upgrades that reduce research time and research coin cost.
- Improved weekly world events with repeat contribution scoring, donation amounts, contributor/player details, and clearer event rows.
- Fixed several mobile tap paths in Market, Workshop events, auth/session handling, and scroll cues so dialogs and rows respond more reliably.

## 0.2.28

- Fixed Guild saves so reloading or reconnecting no longer resets the guild charter, adventurers, board, or logs.

## 0.2.27

- Added a safer admin recovery path for stuck account sessions without touching player saves, progress, markets, or chat data.
- Adjusted Workshop buttons and summon placement so tasks, events, seed bag, discoveries, guild, and leaderboard controls have cleaner spacing on mobile.
- Updated backend bindings for the latest admin maintenance reducers.

## 0.2.26

- Fixed saved Garden plot and Brewing cauldron capacity after prestige reset so bought capacity stays restored correctly from research.
- Moved the Workshop seed bag beside discoveries and adjusted Workshop task, event, summon, and info controls so they fit more cleanly on mobile.
- Improved Elara placement so the tutorial guide avoids the Workshop seed bag control.

## 0.2.25

- Added emerald research support for batch planting and brewing, so upgraded plots and cauldrons can turn multiple normal inputs into multiple outputs in one timer.
- Added emerald save/backend support and resource icons/colors for crystal, emerald, ruby, mana, and coin rows.
- Moved Prestige into the bottom room bar when it is unlocked, replacing the unused quests slot.
- Tightened resource labels and Workshop event/task indicators so potion names and mana sphere text no longer get mistaken for mana currency.

## 0.2.24

- Changed personal daily and weekly task rewards so completed goals wait to be claimed instead of paying out instantly.
- Added clearer claimable reward indicators for personal tasks, including full daily or weekly completion rewards.
- Lowered many level-up task quantities so Workshop progression asks for less grinding across early and later levels.
- Tightened the Workshop personal task popup so completed, claimable, and claimed rows read cleaner on mobile.

## 0.2.23

- Improved Guild forms so charter and settings edits stay in place while the game refreshes in the background.
- Moved Workshop task, world event, and summon controls apart so mobile taps hit the intended button more reliably.
- Reduced player market background loading by keeping trade history data and rows lazy until the popup is opened.

## 0.2.22

- Added the Guild room at level 15, where players can sign a charter, hire adventurers, manage a request board, and follow guild logs.
- Added guild applicants, adventurer detail popups, secretary upgrades, quest results, hospital/death outcomes, and guild page notifications.
- Rebalanced later level requirements and mana regeneration so the midgame asks for a steadier mix of seeds, herbs, and potions.
- Improved player market, alliance quest, and chat subscriptions so active views and notifications load the right server data with less background noise.
- Added release feature-spotlight posting so large player-facing updates can be announced separately from the APK changelog.

## 0.2.21

- Moved the Workshop task and event character labels to align with the leaderboard, with the two characters stacked closer together.

## 0.2.20

- Moved the Workshop task and event characters beside the summon circle, so expanded level requirements stay readable.

## 0.2.19

- Added short tutorial story beats for buying the old workshop and opening Market, Garden, Research, and Brewing.
- Improved Elara tutorial dialogs so room-opening steps use centered popup-style panels with clearer action labels.
- Kept unsent world and alliance chat messages locally for a short time, so they survive popup refreshes while waiting for the server echo.
- Tightened Workshop personal task rows and scrolling so rewards and progress fit better in the popup.

## 0.2.18

- Added Workshop character entry buttons for personal tasks and world events, with clearer popup headers.
- Changed NPC market demand recovery into periodic buyer waves and added demand popup details for the next wave and demand cap.
- Refined weekly world event requests so more events ask for research or supplies instead of direct coin funding.
- Improved Elara's level-2 gardening guidance, advanced research coloring, and level reward row behavior.

## 0.2.17

- Rebuilt the latest APK under version 0.2.17 so Android devices and Discord testers can identify the newest build.

## 0.2.16

- Added weekly world events in the Workshop with normal action requests, coin donations, rewards, and past event history.
- Improved Workshop personal task rows and chat sending so progress reads cleaner and sent messages appear locally while the server echo catches up.
- Made Garden planting and emptying easier by letting plantable or active plot bodies respond, with clearer empty-plot confirmation copy.
- Tightened Brewing recipe and notification states, and hardened save syncing so compact task/event data stays under the server save limit.

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

- Added personal daily and weekly tasks in the Workshop with automatic coin and crystal rewards.
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
- Retuned later level seed requirements and tightened Elara's Market coin guidance around fast-sell tabs, quantity, and sell targets.

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

- Tightened Elara's Market and level-up guidance so later coin goals stay locked onto the real fast-sell flow, selected items, and amount step.
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
- Added clearer coin collection flyouts and fixed first-run account choice gate behavior.

## 0.1.16

- Added colored trade alliance tags in alliance views, chat, and leaderboards.
- Improved level 3 Mira guidance so it continues through mint seed, mint herb, and level-up tasks.
- Smoothed later task requirements so level tasks follow research order more clearly.
- Added clearer coin collection flyouts and fixed first-run account choice gate behavior.

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
