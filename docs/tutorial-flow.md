# Tutorial Flow

Source: `src/pages/tutorial/managers/TutorialStepManager.js`.

Screenshots are captured from the real Vite game surface at the authored `1080x2170` viewport. Run `npm run tutorial:capture` to start the shared dev server when needed, pass the live tutorial, and refresh the PNGs/contact sheet.

The automation uses the real `TutorialFacade`, CSS, Elara assets, and `data-tutorial-id` targets. Dev capture hooks only skip waits/background resource tasks and hide the local offline gate so the screenshots show the actual game UI, not a harness.

Current source starts with a free workshop-entry dialog and routes room openings through short `market opened`, `research opened`, `garden opened`, and `brewing opened` beats. Username setup is no longer part of FTUE; player-facing social surfaces ask for it when first opened. Level 1 completes without coin. Level 2 teaches the current summon, sell, and turn-in requirement order before level-up coin cleanup, using live `sellItems` quantity and quote data instead of tutorial-owned prices. Level 3 introduces Research and the free mint seed unlock, level 4 introduces herbs through Garden requirements, and level 5 introduces Brewing through mana tonic research. Coin-shortfall guidance uses the Market `sellItems` available quantity, not raw inventory, so reserved items that show as `x0` do not become targets. The screenshot set below predates this 35-step order and should be refreshed the next time tutorial captures are regenerated.

![tutorial flow contact sheet](tutorial-flow/contact-sheet.png)

## Graph

```mermaid
flowchart TD
  S01["1. purchase-house<br/>free entry dialog"]
  S02["2. intro-welcome<br/>lesson 1: introduction"]
  S03["3. intro-mana-sphere<br/>target: top-panel mana"]
  S04["4. first-summon-seed<br/>target: summon"]
  S05["5. first-fill-seed-task<br/>target: task fill"]
  S06["6. finish-seed-task<br/>objective: seed task"]
  S07["7. first-task-complete<br/>checkpoint"]
  S08["8. level-up-one<br/>target: free level up"]
  S09["9. intro-market<br/>lesson 2: market"]
  S10["10. prepare-seed-sale<br/>objective: level-2 summon task"]
  S11["11. open-market<br/>target: market tab"]
  S12["12. select-market-stand<br/>target: fast sell button"]
  S13["13. select-sage-seed-sale<br/>target: fast sell sage seed row"]
  S14["14. show-selected-sale-amount<br/>highlight: selected amount"]
  S15["15. earn-tutorial-coin<br/>sell one sage seed"]
  S16["16. first-sale-complete<br/>checkpoint"]
  S17["17. unselect-sage-seed-sale<br/>turn in remaining sage seeds"]
  S18["18. level-up-two<br/>target: level up or market"]
  S19["19. intro-research<br/>lesson 3: research"]
  S20["20. research-mint-seed<br/>passive"]
  S21["21. first-research-complete<br/>checkpoint"]
  S22["22. fill-mint-seed-task<br/>passive"]
  S23["23. fill-sage-seed-task<br/>passive"]
  S24["24. level-up-three<br/>passive"]
  S25["25. intro-garden<br/>lesson 4: gardening"]
  S26["26. grow-sage<br/>objective: first herb"]
  S27["27. first-harvest-complete<br/>checkpoint"]
  S28["28. fill-sage-herb-task<br/>objective: sage task"]
  S29["29. fill-mint-herb-task<br/>passive"]
  S30["30. level-up-four<br/>passive"]
  S31["31. research-mana-tonic<br/>lesson 5: brewing"]
  S32["32. intro-brewing<br/>target: brewing tab"]
  S33["33. brew-mana-tonic<br/>objective: first potion"]
  S34["34. first-brew-complete<br/>checkpoint"]
  S35["35. refill-mana-tonic-cauldron<br/>objective: turn in potion"]
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

  S01 -->|"enter workshop"| S02
  S02 -->|"next"| S03
  S03 -->|"next, mana ready"| S04
  S04 -->|"seed gained"| S05
  S05 -->|"first fill done"| S06
  S06 -->|"seed task complete"| S07
  S07 -->|"next"| S08
  S08 -->|"level 2"| S09
  S09 -->|"next"| S10
  S10 -->|"summon task complete"| S11
  S11 -->|"Market opened"| S12
  S12 -->|"fast sell opened"| S13
  S13 -->|"sage seed selected"| S14
  S14 -->|"2 seconds"| S15
  S15 -->|"one seed sold"| S16
  S16 -->|"next"| S17
  S17 -->|"turn-in task complete"| S18
  S18 -->|"level 3"| S19
  S19 -->|"Research opened"| S20
  S20 -->|"mint seed research complete"| S21
  S21 -->|"next"| S22
  S22 -->|"mint seed task complete"| S23
  S23 -->|"sage seed task complete"| S24
  S24 -->|"level 4"| S25
  S25 -->|"Garden opened"| S26
  S26 -->|"sage grown"| S27
  S27 -->|"next"| S28
  S28 -->|"sage herb task complete"| S29
  S29 -->|"mint herb task complete"| S30
  S30 -->|"level 5"| S31
  S31 -->|"mana tonic research started/completed"| S32
  S32 -->|"Brewing opened"| S33
  S33 -->|"first mana tonic brewed"| S34
  S34 -->|"next"| S35
  S35 -->|"mana tonic task complete, active brew, or level 6"| Done

  S03 -. "paused while mana is not ready" .-> S03
  S05 -. "target can switch: tasks, task row, summon, mana" .-> S05
  S18 -. "if coin short" .-> G00
  S24 -. "if coin short" .-> G00
  S30 -. "if coin short" .-> G00
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

The table below is the last captured screenshot set. It is intentionally retained as historical visual reference, but it does not yet match the current 35-step tutorial order.

| Step | Screenshot |
|---|---|
| 1. `intro-welcome` | <img src="tutorial-flow/screenshots/01-intro-welcome.png" width="220" alt="intro-welcome"> |
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
