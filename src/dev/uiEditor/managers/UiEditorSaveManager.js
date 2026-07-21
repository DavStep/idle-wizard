export class UiEditorSaveManager {
  constructor({
    endpoint = '/__idle-wizard-ui-editor/save',
    fetchImpl = globalThis.fetch?.bind(globalThis),
  } = {}) {
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl;
  }

  async save(layout) {
    if (!this.fetchImpl) {
      throw new Error('The UI editor save API is unavailable.');
    }

    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(layout),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || `UI editor save failed (${response.status}).`);
    }

    return result;
  }
}
