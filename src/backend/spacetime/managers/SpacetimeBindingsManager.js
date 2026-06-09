const DEFAULT_BINDINGS_PATH = '../../spacetimedb/module_bindings/index.ts';
const generatedBindings = import.meta.glob('../../spacetimedb/module_bindings/index.ts');

async function importDefaultBindings() {
  const importBindings = generatedBindings[DEFAULT_BINDINGS_PATH];
  if (!importBindings) {
    throw new Error('Generated SpacetimeDB bindings missing. Run npm run stdb:generate.');
  }

  return importBindings();
}

export class SpacetimeBindingsManager {
  constructor({ importBindings = importDefaultBindings } = {}) {
    this.importBindings = importBindings;
    this.lastError = null;
  }

  async loadDbConnection() {
    try {
      const bindings = await this.importBindings();
      this.lastError = null;
      return bindings.DbConnection ?? bindings.default?.DbConnection ?? null;
    } catch (error) {
      this.lastError = error;
      return null;
    }
  }

  getSnapshot() {
    return {
      available: !this.lastError,
      error: this.lastError?.message ?? null,
    };
  }
}
