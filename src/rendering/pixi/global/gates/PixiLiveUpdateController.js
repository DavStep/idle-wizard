const PREVIEW_TOTAL_BYTES = 24 * 1024 * 1024;

export class PixiLiveUpdateController {
  constructor() {
    this.view = null;
    this.model = null;
    this.previewModel = null;
  }

  attach(view) {
    this.view = view;
    if (this.model || this.previewModel) {
      this.view.bind(this.previewModel ?? this.model);
    }
    return view;
  }

  mount() {
    return this.view?.root ?? null;
  }

  showAvailable({ size, version, onUpdate } = {}) {
    this.show({
      presentation: 'dialog',
      title: 'Update Ready',
      message: `Version ${version} is ready. Download size: ${formatMegabytes(size)}.`,
      progress: false,
      actionLabel: 'Update Game',
      actionVariant: 'green',
      onAction: onUpdate,
    });
  }

  showDownloading({ downloadedBytes, totalBytes, progress } = {}) {
    this.show({
      presentation: 'splash',
      message: `Updating ${formatMegabytes(downloadedBytes)} / ${formatMegabytes(totalBytes)}`,
      progress: true,
      progressValue: progress,
    });
  }

  showPreparing() {
    this.show({
      presentation: 'splash',
      message: 'Finishing update',
      progress: true,
      progressValue: 1,
    });
  }

  showNativeUpdateRequired({ minimumVersion } = {}) {
    this.show({
      presentation: 'dialog',
      title: 'Update Required',
      message: `Install Idle Wizard ${minimumVersion} or newer, then reopen the game.`,
      progress: false,
    });
  }

  showError({ onRetry } = {}) {
    this.show({
      presentation: 'dialog',
      title: 'Update Failed',
      message: 'The update could not be installed. Check your connection and try again.',
      progress: false,
      actionLabel: 'Retry Update',
      actionVariant: 'green',
      onAction: onRetry,
    });
  }

  showPreview({ phase = 'available' } = {}) {
    if (phase === 'downloading') {
      this.showPreviewModel({
        presentation: 'splash',
        message: `Updating ${formatMegabytes(PREVIEW_TOTAL_BYTES * 0.42)} / ${formatMegabytes(PREVIEW_TOTAL_BYTES)}`,
        progress: true,
        progressValue: 0.42,
      });
      return;
    }

    if (phase === 'failed') {
      this.showPreviewModel({
        presentation: 'dialog',
        title: 'Update Failed',
        message: 'The update could not be installed. Check your connection and try again.',
        progress: false,
        actionLabel: 'Retry Update',
        actionVariant: 'green',
        onAction: () => {},
      });
      return;
    }

    this.showPreviewModel({
      presentation: 'dialog',
      title: 'Update Ready',
      message: `Version 0.4.0 is ready. Download size: ${formatMegabytes(PREVIEW_TOTAL_BYTES)}.`,
      progress: false,
      actionLabel: 'Update Game',
      actionVariant: 'green',
      onAction: () => {},
    });
  }

  show(model) {
    this.model = model;
    this.view?.bind(this.previewModel ?? model);
  }

  showPreviewModel(model) {
    this.previewModel = model;
    this.view?.bind(model);
  }

  hide() {
    this.model = null;
    if (!this.previewModel) {
      this.view?.hide();
    }
  }

  unmount() {
    this.previewModel = null;
    this.model = null;
    this.view?.hide();
    this.view = null;
  }
}

export function formatMegabytes(bytes) {
  const megabytes = Math.max(0, Number(bytes) || 0) / (1024 * 1024);
  return `${megabytes.toFixed(1)} MB`;
}
