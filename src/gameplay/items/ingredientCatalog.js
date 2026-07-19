export const ingredientRarities = Object.freeze([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythical',
]);

export const retiredIngredientKeys = Object.freeze(['livingMandrakeRoot']);

export const ingredientCatalog = Object.freeze(
  [
    ['ratTail', 'rat tail', 'common', 'rat-tail'],
    ['crowFeather', 'crow feather', 'common', 'crow-feather'],
    ['frogLeg', 'frog leg', 'common', 'frog-leg'],
    ['toadEye', 'toad eye', 'common', 'toad-eye'],
    ['snakeFang', 'snake fang', 'common', 'snake-fang'],
    ['beetleShell', 'beetle shell', 'common', 'beetle-shell'],
    ['goblinEar', 'goblin ear', 'common', 'goblin-ear'],
    ['batHeart', 'bat heart', 'common', 'bat-heart'],
    ['spiderSilk', 'spider silk', 'common', 'spider-silk'],
    ['slimeCore', 'slime core', 'common', 'slime-core'],

    ['trollTooth', 'troll tooth', 'uncommon', 'troll-tooth'],
    ['ogreKnuckle', 'ogre knuckle', 'uncommon', 'ogre-knuckle'],
    ['impHorn', 'imp horn', 'uncommon', 'imp-horn'],
    ['harpyFeather', 'harpy feather', 'uncommon', 'harpy-feather'],
    ['moonMothWing', 'moon moth wing', 'uncommon', 'moon-moth-wing'],
    ['golemPebble', 'golem pebble', 'uncommon', 'golem-pebble'],
    ['mimicTongue', 'mimic tongue', 'uncommon', 'mimic-tongue'],
    ['cockatriceBeak', 'cockatrice beak', 'uncommon', 'cockatrice-beak'],
    // Type ID 3019 belonged to livingMandrakeRoot and remains reserved.
    null,
    ['dryadBark', 'dryad bark', 'uncommon', 'dryad-bark'],

    ['cyclopsEye', 'cyclops eye', 'rare', 'cyclops-eye'],
    ['werewolfClaw', 'werewolf claw', 'rare', 'werewolf-claw'],
    ['basiliskScale', 'basilisk scale', 'rare', 'basilisk-scale'],
    ['griffinTalon', 'griffin talon', 'rare', 'griffin-talon'],
    ['mermaidTear', 'mermaid tear', 'rare', 'mermaid-tear'],
    ['wraithDust', 'wraith dust', 'rare', 'wraith-dust'],
    ['wyvernStinger', 'wyvern stinger', 'rare', 'wyvern-stinger'],
    ['manticoreBarb', 'manticore barb', 'rare', 'manticore-barb'],
    ['bansheeVeil', 'banshee veil', 'rare', 'banshee-veil'],
    ['gargoyleHeart', 'gargoyle heart', 'rare', 'gargoyle-heart'],

    ['devilWing', 'devil wing', 'epic', 'devil-wing'],
    ['krakenInk', 'kraken ink', 'epic', 'kraken-ink'],
    ['chimeraMane', 'chimera mane', 'epic', 'chimera-mane'],
    ['vampireLordFang', 'vampire lord fang', 'epic', 'vampire-lord-fang'],
    ['sphinxWhisker', 'sphinx whisker', 'epic', 'sphinx-whisker'],
    ['nightmareHoof', 'nightmare hoof', 'epic', 'nightmare-hoof'],
    ['thunderbirdPlume', 'thunderbird plume', 'epic', 'thunderbird-plume'],
    ['frostGiantBlood', 'frost giant blood', 'epic', 'frost-giant-blood'],
    ['hydraHeart', 'hydra heart', 'epic', 'hydra-heart'],
    ['dragonFang', 'dragon fang', 'epic', 'dragon-fang'],

    ['phoenixFeather', 'phoenix feather', 'legendary', 'phoenix-feather'],
    [
      'unicornHornShard',
      'unicorn horn shard',
      'legendary',
      'unicorn-horn-shard',
    ],
    ['leviathanScale', 'leviathan scale', 'legendary', 'leviathan-scale'],
    [
      'fallenAngelFeather',
      'fallen angel feather',
      'legendary',
      'fallen-angel-feather',
    ],
    [
      'celestialStagAntler',
      'celestial stag antler',
      'legendary',
      'celestial-stag-antler',
    ],
    ['titansEmber', "titan's ember", 'legendary', 'titans-ember'],
    ['archdemonHorn', 'archdemon horn', 'legendary', 'archdemon-horn'],
    ['timeWyrmScale', 'time wyrm scale', 'legendary', 'time-wyrm-scale'],
    ['sunbirdHeart', 'sunbird heart', 'legendary', 'sunbird-heart'],
    ['voidKrakenPearl', 'void kraken pearl', 'legendary', 'void-kraken-pearl'],

    [
      'ancientLichPhylactery',
      'ancient lich phylactery',
      'mythical',
      'ancient-lich-phylactery',
    ],
    [
      'worldSerpentVenom',
      'world serpent venom',
      'mythical',
      'world-serpent-venom',
    ],
    [
      'primordialDragonHeart',
      'primordial dragon heart',
      'mythical',
      'primordial-dragon-heart',
    ],
    [
      'tearOfAForgottenGod',
      'tear of a forgotten god',
      'mythical',
      'tear-of-a-forgotten-god',
    ],
    ['starEaterTooth', 'star-eater tooth', 'mythical', 'star-eater-tooth'],
    ['moonGoddessHair', 'moon goddess hair', 'mythical', 'moon-goddess-hair'],
    ['cosmicPhoenixAsh', 'cosmic phoenix ash', 'mythical', 'cosmic-phoenix-ash'],
    [
      'firstFlameFragment',
      'first flame fragment',
      'mythical',
      'first-flame-fragment',
    ],
    ['chaosBeastCore', 'chaos beast core', 'mythical', 'chaos-beast-core'],
    [
      'featherOfEternity',
      'feather of eternity',
      'mythical',
      'feather-of-eternity',
    ],
  ].flatMap((ingredient, index) => {
    if (!ingredient) {
      return [];
    }

    const [key, label, rarity, assetSlug] = ingredient;
    return [Object.freeze({ id: 3001 + index, key, label, rarity, assetSlug })];
  }),
);
