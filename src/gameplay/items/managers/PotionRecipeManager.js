const recipeCatalog = [
  {
    potionKey: 'manaTonic',
    manaCost: 5,
    brewDurationMs: 4_000,
    ingredients: [{ itemKey: 'sageHerb', quantity: 3 }],
  },
  {
    potionKey: 'minorHealingPotion',
    manaCost: 5,
    brewDurationMs: 5_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'nettleVigor',
    manaCost: 6,
    brewDurationMs: 5_000,
    ingredients: [
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'calmingDraught',
    manaCost: 8,
    brewDurationMs: 7_000,
    ingredients: [
      { itemKey: 'mintHerb', quantity: 2 },
      { itemKey: 'lavenderHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'simpleAntidote',
    manaCost: 10,
    brewDurationMs: 8_000,
    ingredients: [
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'venomDraught',
    manaCost: 12,
    brewDurationMs: 9_000,
    ingredients: [
      { itemKey: 'mandrakeHerb', quantity: 1 },
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'glowcapHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'briarWard',
    manaCost: 12,
    brewDurationMs: 9_000,
    ingredients: [
      { itemKey: 'briarHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'lanternTonic',
    manaCost: 10,
    brewDurationMs: 8_000,
    ingredients: [
      { itemKey: 'glowcapHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'healingPotion',
    manaCost: 5,
    brewDurationMs: 6_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 2 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'moonlitFocus',
    manaCost: 14,
    brewDurationMs: 10_000,
    ingredients: [
      { itemKey: 'moonflowerHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'sunrootStamina',
    manaCost: 16,
    brewDurationMs: 10_000,
    ingredients: [
      { itemKey: 'sunrootHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'frostmossCleanse',
    manaCost: 18,
    brewDurationMs: 12_000,
    ingredients: [
      { itemKey: 'frostmossHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'sleepDraught',
    manaCost: 20,
    brewDurationMs: 12_000,
    ingredients: [
      { itemKey: 'dreambellHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 2 },
      { itemKey: 'moonflowerHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'elixirOfLife',
    manaCost: 20,
    brewDurationMs: 12_000,
    ingredients: [
      { itemKey: 'mandrakeHerb', quantity: 3 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'starLuckPhiltre',
    manaCost: 24,
    brewDurationMs: 14_000,
    ingredients: [
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'dragonCourage',
    manaCost: 28,
    brewDurationMs: 16_000,
    ingredients: [
      { itemKey: 'dragonpepperHerb', quantity: 1 },
      { itemKey: 'sunrootHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'deepDreamVision',
    manaCost: 30,
    brewDurationMs: 18_000,
    ingredients: [
      { itemKey: 'dreambellHerb', quantity: 2 },
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'pactWard',
    manaCost: 30,
    brewDurationMs: 18_000,
    ingredients: [
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'briarHerb', quantity: 2 },
      { itemKey: 'frostmossHerb', quantity: 1 },
    ],
  },
];

export class PotionRecipeManager {
  constructor({ itemDefinitionManager }) {
    this.itemDefinitionManager = itemDefinitionManager;
  }

  getPotionRecipes() {
    return recipeCatalog.map((recipe) => this.resolveRecipe(recipe));
  }

  getPotionRecipe(potionKey) {
    const recipe = recipeCatalog.find((candidate) => candidate.potionKey === potionKey);

    if (!recipe) {
      throw new Error(`Unknown potion recipe: ${potionKey}`);
    }

    return this.resolveRecipe(recipe);
  }

  resolveRecipe(recipe) {
    const potion = this.itemDefinitionManager.getDefinitionByKey(recipe.potionKey);

    return {
      potionTypeId: potion.id,
      key: potion.key,
      label: potion.label,
      manaCost: recipe.manaCost,
      brewDurationMs: recipe.brewDurationMs,
      ingredients: recipe.ingredients.map((ingredient) =>
        this.resolveIngredient(ingredient),
      ),
    };
  }

  resolveIngredient(ingredient) {
    const item = this.itemDefinitionManager.getDefinitionByKey(ingredient.itemKey);

    return {
      itemTypeId: item.id,
      key: item.key,
      label: item.label,
      kind: item.kind,
      quantity: ingredient.quantity,
    };
  }
}
