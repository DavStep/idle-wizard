type ConfigRow = Record<string, unknown>;

const POTION_INGREDIENT_VALUE_MULTIPLIER = 4;
const ITEM_PRICE_DECIMAL_SCALE = 100;

const legacyPotionSellPriceGoldByKey: Readonly<Record<string, number>> = Object.freeze({
  manaTonic: 55.2,
  minorHealingPotion: 60,
  nettleVigor: 65.6,
  calmingDraught: 75.2,
  simpleAntidote: 100,
  venomDraught: 125.6,
  briarWard: 105.6,
  lanternTonic: 100,
  healingPotion: 90.4,
  moonlitFocus: 125.6,
  sunrootStamina: 155.2,
  frostmossCleanse: 160,
  sleepDraught: 200,
  elixirOfLife: 250.4,
  starLuckPhiltre: 255.2,
  dragonCourage: 285.6,
  deepDreamVision: 365.6,
  pactWard: 270.4,
  ashenMemory: 130.4,
  silverleafQuiet: 130.4,
  emberSight: 255.2,
  thornSleep: 155.2,
  glassMoonElixir: 285.6,
  rootboundResolve: 175.2,
  nightOrchardTonic: 245.6,
  starlessCourage: 325.6,
  frostveinDraught: 225.6,
  bloodlightWard: 250.4,
  silverleafSalve: 340,
  yarrowPoultice: 368,
  hyssopClarity: 400,
  valerianRest: 436,
  comfreyBalm: 476,
  nightshadeVeil: 520,
  belladonnaSight: 568,
  wormwoodPurge: 620,
  snowdropBreath: 676,
  pearlrootDraught: 740,
});

export function appendMissingItemConfigRows(
  existingRows: unknown,
  defaultRows: unknown,
  getKey: (row: ConfigRow) => string,
) {
  if (!Array.isArray(defaultRows)) {
    return existingRows;
  }

  if (!Array.isArray(existingRows)) {
    return [...defaultRows];
  }

  const seenKeys = new Set(existingRows.filter(isConfigRow).map(getKey));
  const missingRows = defaultRows.filter((row) =>
    isConfigRow(row) ? !seenKeys.has(getKey(row)) : false,
  );

  return missingRows.length > 0 ? [...existingRows, ...missingRows] : existingRows;
}

export function normalizeLegacySeedSummonCosts(
  existingRows: unknown,
  defaultRows: unknown,
  getKey: (row: ConfigRow) => string,
) {
  if (!Array.isArray(existingRows) || !Array.isArray(defaultRows)) {
    return existingRows;
  }

  const defaultRowsByKey = new Map(defaultRows.filter(isConfigRow).map((row) => [
    getKey(row),
    row,
  ]));
  let changed = false;
  const normalizedRows = existingRows.map((row) => {
    if (!isConfigRow(row) || ![15, 50].includes(Number(row.summonManaCost))) {
      return row;
    }

    const defaultRow = defaultRowsByKey.get(getKey(row));

    if (!defaultRow) {
      return row;
    }

    changed = true;
    return {
      ...row,
      summonManaCost: defaultRow.summonManaCost,
    };
  });

  return changed ? normalizedRows : existingRows;
}

export function normalizeLegacyPotionSellPrices(
  existingPotionRows: unknown,
  herbRows: unknown,
  recipes: unknown,
  getKey: (row: ConfigRow) => string,
) {
  if (
    !Array.isArray(existingPotionRows) ||
    !Array.isArray(herbRows) ||
    !Array.isArray(recipes)
  ) {
    return existingPotionRows;
  }

  const herbPriceByKey = new Map(
    herbRows.filter(isConfigRow).map((row) => [getKey(row), Number(row.baseSellPrice)]),
  );
  const recipeByPotionKey = new Map(
    recipes
      .filter(isConfigRow)
      .map((recipe) => [String(recipe.potionKey ?? ''), recipe]),
  );
  let changed = false;
  const normalizedRows = existingPotionRows.map((row) => {
    if (!isConfigRow(row)) {
      return row;
    }

    const potionKey = getKey(row);
    const legacyPrice = legacyPotionSellPriceGoldByKey[potionKey];

    if (legacyPrice === undefined || Number(row.baseSellPrice) !== legacyPrice) {
      return row;
    }

    const recipe = recipeByPotionKey.get(potionKey);

    if (!recipe || !Array.isArray(recipe.ingredients)) {
      return row;
    }

    let ingredientValue = 0;

    for (const ingredient of recipe.ingredients) {
      if (!isConfigRow(ingredient)) {
        return row;
      }

      const itemKey = getKey({ key: ingredient.itemKey });
      const herbPrice = herbPriceByKey.get(itemKey);
      const quantity = Number(ingredient.quantity);

      if (
        typeof herbPrice !== 'number' ||
        !Number.isFinite(herbPrice) ||
        herbPrice < 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return row;
      }

      ingredientValue += herbPrice * quantity;
    }

    const nextPrice =
      Math.round(
        ingredientValue *
          POTION_INGREDIENT_VALUE_MULTIPLIER *
          ITEM_PRICE_DECIMAL_SCALE,
      ) / ITEM_PRICE_DECIMAL_SCALE;

    if (!Number.isFinite(nextPrice) || nextPrice === legacyPrice) {
      return row;
    }

    changed = true;
    return { ...row, baseSellPrice: nextPrice };
  });

  return changed ? normalizedRows : existingPotionRows;
}

function isConfigRow(value: unknown): value is ConfigRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
