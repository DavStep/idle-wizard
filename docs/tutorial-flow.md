# Tutorial Flow

Source: `src/pages/tutorial/managers/TutorialStepManager.js`.

Screenshots are captured from the real Vite game surface at the authored `1080x2170` viewport. Run `npm run tutorial:capture` to start the shared dev server when needed, pass the live tutorial, and refresh the PNGs/contact sheet.

The automation uses the real `TutorialFacade`, CSS, Elara assets, and `data-tutorial-id` targets. Dev capture hooks only skip waits/background resource tasks and hide the local offline gate so the screenshots show the actual game UI, not a harness.

Current source starts with a purchase dialog and routes room openings through short `market opened`, `garden opened`, `research opened`, and `brewing opened` beats. The Garden opening beat waits until the player has a sage seed or active sage crop; otherwise lesson 3 starts from Workshop requirements and summon guidance so the player is not sent to an empty Garden and back. The first fast-sell lesson selects the item, shows the selected amount for two seconds, then advances to the `sell` button without player input. Coin-shortfall guidance uses the Market `sellItems` available quantity, not raw inventory, so reserved items that show as `x0` do not become targets. The screenshot set below predates those routing and room-open changes and should be refreshed the next time tutorial captures are regenerated.

![tutorial flow contact sheet](tutorial-flow/contact-sheet.png)

## Graph

```mermaid
flowchart TD
  S01["1. intro-welcome<br/>lesson 1: introduction"]
  S02["2. intro-username<br/>target: username"]
  S03["3. intro-username-return<br/>greet entered name"]
  S04["4. intro-mana-sphere<br/>target: top-panel mana"]
  S05["5. first-summon-seed<br/>target: summon"]
  S06["6. first-fill-seed-task<br/>target: task fill"]
  S07["7. finish-seed-task<br/>objective: seed task"]
  S08["8. intro-market<br/>lesson 2: market"]
  S09["9. prepare-seed-sale<br/>objective: one seed to sell"]
  S10["10. open-market<br/>target: market tab"]
  S11["11. select-market-stand<br/>target: fast sell button"]
  S12["12. select-sage-seed-sale<br/>target: fast sell sage seed row"]
  S13["13. show-selected-sale-amount<br/>target: selected amount"]
  S14["14. earn-tutorial-coin<br/>effect: tutorial fast sell"]
  S15["15. unselect-sage-seed-sale<br/>target: empty picker row"]
  S16["16. level-up-one<br/>target: level up"]
  S17["17. grow-sage<br/>lesson 3: gardening"]
  S18["18. fill-sage-herb-task<br/>objective: sage task"]
  S19["19. level-up-two<br/>target: level up or market"]
  S20["20. research-mint-seed<br/>passive"]
  S21["21. fill-mint-seed-task<br/>passive"]
  S22["22. fill-mint-herb-task<br/>passive"]
  S23["23. level-up-three<br/>passive"]
  S24["24. research-mana-tonic<br/>lesson 4: brewing"]
  S25["25. brew-mana-tonic<br/>objective: first potion"]
  S26["26. refill-mana-tonic-cauldron<br/>objective: refill cauldron"]
  Done["tutorial hidden / complete"]
  G00["coin shortfall"]
  G01{"available fast-sell quantity?"}
  G02["no: obtain source<br/>sage or mint"]
  G03{"on Market page?"}
  G04["no: open Market"]
  G05{"fast sell open?"}
  G06["no: open fast sell"]
  G07{"item selected and quantity > 0?"}
  G08["yes: target sell if enough<br/>otherwise +1"]
  G09{"matching tab open?"}
  G10["no: open seeds/herbs/potions tab"]
  G11["yes: choose first item<br/>with quantity > 0"]

  S01 -->|"next, top panel unlocks"| S02
  S02 -->|"username saved"| S03
  S03 -->|"next"| S04
  S04 -->|"next, mana ready"| S05
  S05 -->|"seed gained"| S06
  S06 -->|"first fill done"| S07
  S07 -->|"seed task complete"| S08
  S08 -->|"next"| S09
  S09 -->|"seed exists"| S10
  S10 -->|"Market opened"| S11
  S11 -->|"fast sell opened"| S12
  S12 -->|"sage seed selected"| S13
  S13 -->|"2 seconds"| S14
  S14 -->|"10 coin earned"| S15
  S15 -->|"stand emptied"| S16
  S16 -->|"level 2"| S17
  S17 -->|"sage grown"| S18
  S18 -->|"sage task complete"| S19
  S19 -->|"level 3"| S20
  S20 -->|"mint seed research complete"| S21
  S21 -->|"mint seed task complete"| S22
  S22 -->|"mint herb task complete"| S23
  S23 -->|"level 4"| S24
  S24 -->|"mana tonic research started/completed"| S25
  S25 -->|"first mana tonic brewed"| S26
  S26 -->|"mana tonic task complete, active brew, or level 5"| Done

  S05 -. "paused while mana is not ready" .-> S05
  S07 -. "target can switch: tasks, task row, summon, mana" .-> S07
  S19 -. "if coin short" .-> G00
  S23 -. "if coin short" .-> G00
  G00 --> G01
  G01 -->|"no"| G02
  G01 -->|"yes"| G03
  G03 -->|"no"| G04
  G03 -->|"yes"| G05
  G05 -->|"no"| G06
  G05 -->|"yes"| G07
  G07 -->|"yes"| G08
  G07 -->|"no"| G09
  G09 -->|"no"| G10
  G09 -->|"yes"| G11
```

## Screenshots

The table below is the last captured screenshot set and does not yet include `show-selected-sale-amount`.

| Step | Screenshot |
|---|---|
| 1. `intro-welcome` | <img src="tutorial-flow/screenshots/01-intro-welcome.png" width="220" alt="intro-welcome"> |
| 2. `intro-username` | <img src="tutorial-flow/screenshots/02-intro-username.png" width="220" alt="intro-username"> |
| 3. `intro-username-return` | <img src="tutorial-flow/screenshots/03-intro-username-return.png" width="220" alt="intro-username-return"> |
| 4. `intro-mana-sphere` | <img src="tutorial-flow/screenshots/04-intro-mana-sphere.png" width="220" alt="intro-mana-sphere"> |
| 5. `first-summon-seed` | <img src="tutorial-flow/screenshots/05-first-summon-seed.png" width="220" alt="first-summon-seed"> |
| 6. `first-fill-seed-task` | <img src="tutorial-flow/screenshots/06-first-fill-seed-task.png" width="220" alt="first-fill-seed-task"> |
| 7. `finish-seed-task` | <img src="tutorial-flow/screenshots/07-finish-seed-task.png" width="220" alt="finish-seed-task"> |
| 8. `intro-market` | <img src="tutorial-flow/screenshots/08-intro-market.png" width="220" alt="intro-market"> |
| 9. `prepare-seed-sale` | <img src="tutorial-flow/screenshots/09-prepare-seed-sale.png" width="220" alt="prepare-seed-sale"> |
| 10. `open-market` | <img src="tutorial-flow/screenshots/10-open-market.png" width="220" alt="open-market"> |
| 11. `select-market-stand` | <img src="tutorial-flow/screenshots/11-select-market-stand.png" width="220" alt="select-market-stand"> |
| 12. `select-sage-seed-sale` | <img src="tutorial-flow/screenshots/12-select-sage-seed-sale.png" width="220" alt="select-sage-seed-sale"> |
| 13. `earn-tutorial-coin` | <img src="tutorial-flow/screenshots/13-earn-tutorial-coin.png" width="220" alt="earn-tutorial-coin"> |
| 14. `unselect-sage-seed-sale` | <img src="tutorial-flow/screenshots/14-unselect-sage-seed-sale.png" width="220" alt="unselect-sage-seed-sale"> |
| 15. `level-up-one` | <img src="tutorial-flow/screenshots/15-level-up-one.png" width="220" alt="level-up-one"> |
| 16. `grow-sage` | <img src="tutorial-flow/screenshots/16-grow-sage.png" width="220" alt="grow-sage"> |
| 17. `fill-sage-herb-task` | <img src="tutorial-flow/screenshots/17-fill-sage-herb-task.png" width="220" alt="fill-sage-herb-task"> |
| 18. `level-up-two` | <img src="tutorial-flow/screenshots/18-level-up-two.png" width="220" alt="level-up-two"> |
| 19. `research-mint-seed` | <img src="tutorial-flow/screenshots/19-research-mint-seed.png" width="220" alt="research-mint-seed"> |
| 20. `fill-mint-seed-task` | <img src="tutorial-flow/screenshots/20-fill-mint-seed-task.png" width="220" alt="fill-mint-seed-task"> |
| 21. `fill-mint-herb-task` | <img src="tutorial-flow/screenshots/21-fill-mint-herb-task.png" width="220" alt="fill-mint-herb-task"> |
| 22. `level-up-three` | <img src="tutorial-flow/screenshots/22-level-up-three.png" width="220" alt="level-up-three"> |
| 23. `research-mana-tonic` | <img src="tutorial-flow/screenshots/23-research-mana-tonic.png" width="220" alt="research-mana-tonic"> |
| 24. `brew-mana-tonic` | <img src="tutorial-flow/screenshots/24-brew-mana-tonic.png" width="220" alt="brew-mana-tonic"> |
| 25. `refill-mana-tonic-cauldron` | <img src="tutorial-flow/screenshots/25-refill-mana-tonic-cauldron.png" width="220" alt="refill-mana-tonic-cauldron"> |

## Files

- Automation: `scripts/capture-tutorial-flow.js`
- Contact sheet: `docs/tutorial-flow/contact-sheet.png`
- Individual PNGs: `docs/tutorial-flow/screenshots/`
