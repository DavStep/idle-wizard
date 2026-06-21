# Guild

Guild is a private player hall unlocked at level 15. The player buys a charter,
sets name/tag/color, hires solo adventurers, and watches them take request-board
work on their own.

The heavy state stays in gameplay save: adventurers, applicants, board, logs,
secretary level, and simulation timestamps. Server profile sync should only keep
tiny public guild identity fields when added later: name, tag, color, created time.

Adventurers simulate in lazy 10-minute ticks. They live idle actions, choose board
requests by personality/stat fit, roll d20 quest outcomes, gain xp, bring rewards,
go to hospital, or die.
