# First Run Intro

The first-run intro is a stage-level prelude shown only after a fresh empty save marks it pending. It shows the demon-castle story, then hands control to the existing Elara tutorial. Username setup belongs to later player-facing profile or social surfaces, not this cutscene.

It is not gameplay or economy. Story reward and free workshop entry beats are visual setup only; the real tutorial/gameplay state still comes from `GameplayFacade` and `TutorialFacade`.

Intro progress uses its own local storage key so existing accounts do not see the prelude just because tutorial storage is missing. Fresh-start flows explicitly mark it pending before mounting pages.

Run `node scripts/capture-tutorial-flow.js --first-run-only` with the shared QA-enabled dev server and local backend running to capture the account choice, intro artwork, and first `next` transition under `tmp/first-run-qa/`.
