# Tutorial Flow

Source: `src/pages/tutorial/managers/TutorialStepManager.js`.

Screenshots are captured from the real Vite game surface at the authored `390x844` viewport. Run `npm run tutorial:capture` to start the shared dev server when needed, pass the live tutorial, and refresh the PNGs/contact sheet.

The automation uses the real `TutorialFacade`, CSS, Elara assets, and `data-tutorial-id` targets. Dev capture hooks only skip waits/background resource tasks and hide the local offline gate so the screenshots show the actual game UI, not a harness.

Current source has a 31-step source order. The default screenshot capture tracks 28 of those steps; it excludes the purchase dialog, the final level-1 turn-in transition, and the balance-conditional `fill-sage-seed-task` branch. Every level advances automatically when its final request completes. Level 2 teaches the timed stall flow: open the Market, open the first stall, select sage seed, set the allocation rail to `25%`, mark one seed, then wait for the stall's five-second sale. Coin-shortfall guidance uses available Market quantities, loaded stall state, and the `shop:sell:*` tutorial targets. The screenshot set below predates the current source order and should be refreshed with `npm run tutorial:capture`.

![tutorial flow contact sheet](tutorial-flow/contact-sheet.png)

## Current Source Order

This table mirrors `getTutorialStepGraph()` from `TutorialStepManager.js`.

| Code | Step | Kind | Lesson | Page | Target | Cue / note |
|---|---|---|---|---|---|---|
| `t01` | `purchase-house` | dialog | The Story Begins |  |  |  |
| `t02` | `intro-welcome` | prompt | Lesson 1: Introduction |  |  |  |
| `t03` | `intro-mana-sphere` | prompt | Lesson 1: Introduction | workshop | top:mana |  |
| `t04` | `first-summon-seed` | prompt | Lesson 1: Introduction | workshop | workshop:summonSeed | delay 2000ms |
| `t05` | `summon-five-seeds` | objective | Lesson 1: Introduction | workshop |  |  |
| `t06` | `intro-level-requirements` | prompt | Lesson 1: Introduction | workshop |  |  |
| `t07` | `first-fill-seed-task` | prompt | Lesson 1: Introduction | workshop |  |  |
| `t08` | `finish-seed-task` | objective | Lesson 1: Introduction | workshop |  |  |
| `t09` | `intro-market` | dialog | Market Opened |  | workshop:summonSeed |  |
| `t10` | `prepare-seed-sale` | objective | Lesson 2: Market | workshop |  |  |
| `t11` | `open-market` | objective | Lesson 2: Market | shop | page:shop |  |
| `t12` | `select-market-stand` | objective | Lesson 2: Market | shop | shop:stand:1 |  |
| `t13` | `select-sage-seed-sale` | objective | Lesson 2: Market | shop |  |  |
| `t14` | `earn-tutorial-coin` | objective | Lesson 2: Market |  |  | timed stall wait |
| `t15` | `first-sale-complete` | prompt | Lesson 2: Market |  | page:workshop |  |
| `t16` | `unselect-sage-seed-sale` | objective | Lesson 2: Market | workshop |  |  |
| `t17` | `intro-research` | dialog | Research Opened |  | page:research |  |
| `t18` | `research-mint-seed` | objective | Lesson 3: Research | research | research:unlockSeed:mintSeed | passive |
| `t19` | `first-research-complete` | prompt | Lesson 3: Research |  |  |  |
| `t20` | `fill-mint-seed-task` | objective | Lesson 3: Research |  |  | passive |
| `t21` | `fill-sage-seed-task` | objective | Lesson 3: Research |  |  | passive; balance-conditional branch excluded from default capture |
| `t22` | `intro-garden` | dialog | Garden Opened |  | page:garden |  |
| `t23` | `grow-sage` | objective | Lesson 4: Gardening |  |  | delayed-target |
| `t24` | `first-harvest-complete` | prompt | Lesson 4: Gardening |  |  |  |
| `t25` | `fill-sage-herb-task` | objective | Lesson 4: Gardening |  |  | delayed-target |
| `t26` | `fill-mint-herb-task` | objective | Lesson 4: Gardening |  |  | passive |
| `t27` | `research-mana-tonic` | objective | Lesson 5: Brewing | research | research:unlockRecipe:manaTonic |  |
| `t28` | `intro-brewing` | dialog | Brewing Opened |  | page:brewing |  |
| `t29` | `brew-mana-tonic` | objective | Lesson 5: Brewing | brewing |  |  |
| `t30` | `first-brew-complete` | prompt | Lesson 5: Brewing |  |  |  |
| `t31` | `refill-mana-tonic-cauldron` | objective | Lesson 5: Brewing |  |  |  |

## Graph

```mermaid
flowchart TD
  S01["1. purchase-house<br/>The Story Begins"]
  S02["2. intro-welcome<br/>Lesson 1: Introduction"]
  S03["3. intro-mana-sphere<br/>Lesson 1: Introduction"]
  S04["4. first-summon-seed<br/>Lesson 1: Introduction"]
  S05["5. summon-five-seeds<br/>Lesson 1: Introduction"]
  S06["6. intro-level-requirements<br/>Lesson 1: Introduction"]
  S07["7. first-fill-seed-task<br/>Lesson 1: Introduction"]
  S08["8. finish-seed-task<br/>Lesson 1: Introduction"]
  S09["9. intro-market<br/>Market Opened"]
  S10["10. prepare-seed-sale<br/>Lesson 2: Market"]
  S11["11. open-market<br/>Lesson 2: Market"]
  S12["12. select-market-stand<br/>Lesson 2: Market"]
  S13["13. select-sage-seed-sale<br/>Lesson 2: Market"]
  S14["14. earn-tutorial-coin<br/>Lesson 2: Market"]
  S15["15. first-sale-complete<br/>Lesson 2: Market"]
  S16["16. unselect-sage-seed-sale<br/>Lesson 2: Market"]
  S17["17. intro-research<br/>Research Opened"]
  S18["18. research-mint-seed<br/>Lesson 3: Research"]
  S19["19. first-research-complete<br/>Lesson 3: Research"]
  S20["20. fill-mint-seed-task<br/>Lesson 3: Research"]
  S21["21. fill-sage-seed-task<br/>conditional"]
  S22["22. intro-garden<br/>Garden Opened"]
  S23["23. grow-sage<br/>Lesson 4: Gardening"]
  S24["24. first-harvest-complete<br/>Lesson 4: Gardening"]
  S25["25. fill-sage-herb-task<br/>Lesson 4: Gardening"]
  S26["26. fill-mint-herb-task<br/>Lesson 4: Gardening"]
  S27["27. research-mana-tonic<br/>Lesson 5: Brewing"]
  S28["28. intro-brewing<br/>Brewing Opened"]
  S29["29. brew-mana-tonic<br/>Lesson 5: Brewing"]
  S30["30. first-brew-complete<br/>Lesson 5: Brewing"]
  S31["31. refill-mana-tonic-cauldron<br/>Lesson 5: Brewing"]
  Done["tutorial hidden / complete"]

  S01 --> S02
  S02 --> S03
  S03 --> S04
  S04 --> S05
  S05 --> S06
  S06 --> S07
  S07 --> S08
  S08 --> S09
  S09 --> S10
  S10 --> S11
  S11 --> S12
  S12 --> S13
  S13 --> S14
  S14 --> S15
  S15 --> S16
  S16 --> S17
  S17 --> S18
  S18 --> S19
  S19 --> S20
  S20 --> S21
  S21 --> S22
  S20 -. "default balance skips sage seed task" .-> S22
  S21 --> S22
  S22 --> S23
  S23 --> S24
  S24 --> S25
  S25 --> S26
  S26 --> S27
  S27 --> S28
  S28 --> S29
  S29 --> S30
  S30 --> S31
  S31 --> Done
```

## Screenshots

The table below is the last captured screenshot set. It is intentionally retained as historical visual reference, but it does not cover the current 31-step tutorial source order or the 28-step default capture set.

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
| 16. `grow-sage` | <img src="tutorial-flow/screenshots/16-grow-sage.png" width="220" alt="grow-sage"> |
| 17. `fill-sage-herb-task` | <img src="tutorial-flow/screenshots/17-fill-sage-herb-task.png" width="220" alt="fill-sage-herb-task"> |
| 19. `research-mint-seed` | <img src="tutorial-flow/screenshots/19-research-mint-seed.png" width="220" alt="research-mint-seed"> |
| 20. `fill-mint-seed-task` | <img src="tutorial-flow/screenshots/20-fill-mint-seed-task.png" width="220" alt="fill-mint-seed-task"> |
| 21. `fill-mint-herb-task` | <img src="tutorial-flow/screenshots/21-fill-mint-herb-task.png" width="220" alt="fill-mint-herb-task"> |
| 23. `research-mana-tonic` | <img src="tutorial-flow/screenshots/23-research-mana-tonic.png" width="220" alt="research-mana-tonic"> |
| 24. `brew-mana-tonic` | <img src="tutorial-flow/screenshots/24-brew-mana-tonic.png" width="220" alt="brew-mana-tonic"> |
| 25. `refill-mana-tonic-cauldron` | <img src="tutorial-flow/screenshots/25-refill-mana-tonic-cauldron.png" width="220" alt="refill-mana-tonic-cauldron"> |

## Files

- Automation: `scripts/capture-tutorial-flow.js`
- Contract check: `node scripts/capture-tutorial-flow.js --check`
- Contact sheet: `docs/tutorial-flow/contact-sheet.png`
- Individual PNGs: `docs/tutorial-flow/screenshots/`
