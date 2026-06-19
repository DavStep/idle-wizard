# Seed Summoning

Seed summoning spends mana and rolls only researched seed drops.

Seed config owns the base `dropWeight`. Player drop preferences multiply that base weight at roll time:

- `none`: `0`
- `low`: `1`
- `medium`: `2`
- `high`: `3`

Keep `dropWeight` as config data. Use `effectiveDropWeight` for rolled odds and displayed chances.

Do not allow the player to set every unlocked seed to `none`; at least one researched seed must stay active.
