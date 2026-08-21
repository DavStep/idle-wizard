# Seed Summoning

Seed summoning spends mana and rolls only researched seed drops.

Summon Seed research is a four-rank star upgrade that raises the selectable
batch maximum from `x1` through `x5`. The Workshop `xN` control cycles from
`1` through that maximum and back to `1`; mana cost and rolled seed count both
use the selected quantity at `10` base mana per seed. Existing saves without a
quantity selection continue to use the highest unlocked batch. A lower manual
selection persists, while selecting the current maximum follows future star
upgrades automatically. Manual and automatic summoning share the selection.

Seed config owns the base `dropWeight`. Player drop preferences multiply that base weight at roll time:

- `none`: `0`
- `low`: `1`
- `medium`: `2`
- `high`: `3`

Keep `dropWeight` as config data. Use `effectiveDropWeight` for rolled odds and displayed chances.

The player may set every unlocked seed to `none`. Summoning stays unavailable
until at least one researched seed has an active weight again.

Successful manual summons play one short pop per seed returned by the summon.
Automation and rejected summon requests do not play this player-action cue.
