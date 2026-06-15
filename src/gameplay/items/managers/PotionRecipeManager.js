const recipeCatalog = [
  {
    potionKey: 'manaTonic',
    manaCost: 12,
    brewDurationMs: 30_000,
    ingredients: [{ itemKey: 'sageHerb', quantity: 3 }],
  },
  {
    potionKey: 'minorHealingPotion',
    manaCost: 14,
    brewDurationMs: 35_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'nettleVigor',
    manaCost: 16,
    brewDurationMs: 40_000,
    ingredients: [
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'calmingDraught',
    manaCost: 18,
    brewDurationMs: 45_000,
    ingredients: [
      { itemKey: 'mintHerb', quantity: 2 },
      { itemKey: 'lavenderHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'briarWard',
    manaCost: 24,
    brewDurationMs: 60_000,
    ingredients: [
      { itemKey: 'briarHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'lanternTonic',
    manaCost: 22,
    brewDurationMs: 55_000,
    ingredients: [
      { itemKey: 'glowcapHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'simpleAntidote',
    manaCost: 22,
    brewDurationMs: 50_000,
    ingredients: [
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'venomDraught',
    manaCost: 24,
    brewDurationMs: 60_000,
    ingredients: [
      { itemKey: 'mandrakeHerb', quantity: 1 },
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'glowcapHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'healingPotion',
    manaCost: 26,
    brewDurationMs: 65_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 2 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'sunrootStamina',
    manaCost: 34,
    brewDurationMs: 75_000,
    ingredients: [
      { itemKey: 'sunrootHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'moonlitFocus',
    manaCost: 30,
    brewDurationMs: 70_000,
    ingredients: [
      { itemKey: 'moonflowerHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'frostmossCleanse',
    manaCost: 38,
    brewDurationMs: 85_000,
    ingredients: [
      { itemKey: 'frostmossHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'sleepDraught',
    manaCost: 42,
    brewDurationMs: 95_000,
    ingredients: [
      { itemKey: 'dreambellHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 2 },
      { itemKey: 'moonflowerHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'elixirOfLife',
    manaCost: 44,
    brewDurationMs: 100_000,
    ingredients: [
      { itemKey: 'mandrakeHerb', quantity: 3 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'starLuckPhiltre',
    manaCost: 50,
    brewDurationMs: 110_000,
    ingredients: [
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'deepDreamVision',
    manaCost: 62,
    brewDurationMs: 135_000,
    ingredients: [
      { itemKey: 'dreambellHerb', quantity: 2 },
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'pactWard',
    manaCost: 64,
    brewDurationMs: 145_000,
    ingredients: [
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'briarHerb', quantity: 2 },
      { itemKey: 'frostmossHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'dragonCourage',
    manaCost: 58,
    brewDurationMs: 125_000,
    ingredients: [
      { itemKey: 'dragonpepperHerb', quantity: 1 },
      { itemKey: 'sunrootHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'ashenMemory',
    manaCost: 36,
    brewDurationMs: 80_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 1 },
      { itemKey: 'frostmossHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'silverleafQuiet',
    manaCost: 34,
    brewDurationMs: 75_000,
    ingredients: [
      { itemKey: 'mintHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'emberSight',
    manaCost: 58,
    brewDurationMs: 120_000,
    ingredients: [
      { itemKey: 'dragonpepperHerb', quantity: 1 },
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'sageHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'thornSleep',
    manaCost: 44,
    brewDurationMs: 90_000,
    ingredients: [
      { itemKey: 'briarHerb', quantity: 1 },
      { itemKey: 'dreambellHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'glassMoonElixir',
    manaCost: 52,
    brewDurationMs: 110_000,
    ingredients: [
      { itemKey: 'moonflowerHerb', quantity: 2 },
      { itemKey: 'frostmossHerb', quantity: 1 },
      { itemKey: 'starAniseHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'rootboundResolve',
    manaCost: 48,
    brewDurationMs: 100_000,
    ingredients: [
      { itemKey: 'sunrootHerb', quantity: 1 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
      { itemKey: 'briarHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'nightOrchardTonic',
    manaCost: 60,
    brewDurationMs: 125_000,
    ingredients: [
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'mintHerb', quantity: 2 },
      { itemKey: 'dreambellHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'starlessCourage',
    manaCost: 68,
    brewDurationMs: 140_000,
    ingredients: [
      { itemKey: 'dragonpepperHerb', quantity: 1 },
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'sunrootHerb', quantity: 1 },
      { itemKey: 'nettleHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'frostveinDraught',
    manaCost: 54,
    brewDurationMs: 115_000,
    ingredients: [
      { itemKey: 'frostmossHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 1 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'bloodlightWard',
    manaCost: 62,
    brewDurationMs: 130_000,
    ingredients: [
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 2 },
      { itemKey: 'briarHerb', quantity: 1 },
      { itemKey: 'sageHerb', quantity: 1 },
    ],
  },
];

export class PotionRecipeManager {
  constructor({ itemDefinitionManager }) {
    this.itemDefinitionManager = itemDefinitionManager;
    this.recipeCatalog = recipeCatalog;
  }

  setRuntimeConfig(config = {}) {
    const recipes = Array.isArray(config) ? config : config.recipes;

    if (!Array.isArray(recipes) || recipes.length <= 0) {
      throw new Error('Potion recipe config requires recipes.');
    }

    const nextRecipes = recipes.map((recipe) => this.readRecipe(recipe));

    for (const recipe of nextRecipes) {
      this.resolveRecipe(recipe);
    }

    this.recipeCatalog = nextRecipes;
  }

  readRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object') {
      throw new Error('Invalid potion recipe config.');
    }

    const potionKey = this.readNonEmptyString(recipe.potionKey);
    const manaCost = this.readNonNegativeNumber(recipe.manaCost);
    const brewDurationMs = this.readPositiveNumber(recipe.brewDurationMs);
    const ingredients = recipe.ingredients;

    if (!Array.isArray(ingredients) || ingredients.length <= 0) {
      throw new Error('Potion recipe config requires ingredients.');
    }

    return {
      potionKey,
      manaCost,
      brewDurationMs,
      ingredients: ingredients.map((ingredient) => ({
        itemKey: this.readNonEmptyString(ingredient?.itemKey),
        quantity: this.readPositiveInteger(ingredient?.quantity),
      })),
    };
  }

  readNonEmptyString(value) {
    if (typeof value !== 'string' || value.trim().length <= 0) {
      throw new Error('Potion recipe config requires non-empty strings.');
    }

    return value.trim();
  }

  readNonNegativeNumber(value) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Potion recipe config requires non-negative numbers.');
    }

    return value;
  }

  readPositiveNumber(value) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Potion recipe config requires positive numbers.');
    }

    return value;
  }

  readPositiveInteger(value) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Potion recipe config requires positive integers.');
    }

    return value;
  }

  getPotionRecipes() {
    return this.recipeCatalog.map((recipe) => this.resolveRecipe(recipe));
  }

  getPotionRecipe(potionKey) {
    const recipe = this.recipeCatalog.find((candidate) => candidate.potionKey === potionKey);

    if (!recipe) {
      throw new Error(`Unknown potion recipe: ${potionKey}`);
    }

    return this.resolveRecipe(recipe);
  }

  getPotionRecipeByIngredientSequence(ingredientItemTypeIds) {
    const recipe = this.recipeCatalog.find((candidate) =>
      this.hasIngredientSequence(candidate, ingredientItemTypeIds),
    );

    return recipe ? this.resolveRecipe(recipe) : null;
  }

  hasIngredientSequence(recipe, ingredientItemTypeIds) {
    const recipeItemTypeIds = this.getRecipeIngredientItemTypeIds(recipe);

    return (
      recipeItemTypeIds.length === ingredientItemTypeIds.length &&
      recipeItemTypeIds.every(
        (itemTypeId, index) => itemTypeId === ingredientItemTypeIds[index],
      )
    );
  }

  getRecipeIngredientItemTypeIds(recipe) {
    return recipe.ingredients.flatMap((ingredient) => {
      const item = this.itemDefinitionManager.getDefinitionByKey(ingredient.itemKey);
      return Array.from({ length: ingredient.quantity }, () => item.id);
    });
  }

  resolveRecipe(recipe) {
    const potion = this.itemDefinitionManager.getDefinitionByKey(recipe.potionKey);

    return {
      potionTypeId: potion.id,
      key: potion.key,
      label: potion.label,
      manaCost: recipe.manaCost,
      brewDurationMs: recipe.brewDurationMs,
      discoveryType: potion.discoveryType ?? null,
      type: potion.type ?? null,
      unknown: potion.unknown === true,
      known: potion.known !== false,
      researchable: potion.researchable !== false,
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
