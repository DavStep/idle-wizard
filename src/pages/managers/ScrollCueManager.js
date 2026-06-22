const SCROLL_CUE_SELECTOR = [
  '.style-page-scroll',
  '.brewing-page__herb-rows',
  '.brewing-page__guide-sequence',
  '.workshop-page__leaderboard-rows',
  '.workshop-page__discoveries-rows',
  '.workshop-page__personal-tasks-frame',
  '.workshop-page__world-notice-frame',
  '.workshop-page__world-chat-messages',
  '.workshop-page__trade-alliance-content',
  '.shop-page__market-panel',
  '.garden-page__herb-rows',
  '.garden-page__plot-rows',
  '.garden-page__seed-rows',
  '.brewing-page__recipe-list',
  '.brewing-page__potion-list',
  '.shop-page__market-rows',
  '.shop-page__trade-history-rows',
  '.shop-page__demand-rows',
  '.shop-page__direct-sell-rows',
  '.shop-page__stock-rows',
  '.shop-page__sell-item-list',
  '.guild-page__popup-content',
  '.room-alliance-info-content',
  '.room-top-panel__settings-pane',
  '.room-top-panel__level-content',
].join(',');

const SCROLL_PROGRESS_PROPERTY = '--style-scroll-progress';
const INLINE_PROGRESS_MODE = 'inline';

function setClassState(element, className, enabled) {
  if (element.classList.contains(className) === enabled) {
    return;
  }

  element.classList.toggle(className, enabled);
}

export function updateScrollCueState({
  scrollElement,
  cueElement = scrollElement,
  progressFill = null,
  progressElement = null,
  inlineCue = true,
} = {}) {
  if (!scrollElement || !cueElement) {
    return null;
  }

  const maxScroll = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
  const progress =
    maxScroll > 0 ? Math.min(Math.max(scrollElement.scrollTop / maxScroll, 0), 1) : 1;
  const percent = Math.round(progress * 100);
  const percentText = `${percent}%`;
  const hasScrollOverflow = maxScroll > 1;
  const hasBottomOverflow = maxScroll > scrollElement.scrollTop + 1;

  if (inlineCue) {
    if (scrollElement.style.getPropertyValue(SCROLL_PROGRESS_PROPERTY) !== percentText) {
      scrollElement.style.setProperty(SCROLL_PROGRESS_PROPERTY, percentText);
    }

    setClassState(cueElement, 'has-scroll-overflow', hasScrollOverflow);
  }

  if (progressFill && progressFill.style.width !== percentText) {
    progressFill.style.width = percentText;
  }

  if (progressElement) {
    const hidden = !hasScrollOverflow;
    if (progressElement.hidden !== hidden) {
      progressElement.hidden = hidden;
    }
  }

  setClassState(cueElement, 'has-bottom-overflow', hasBottomOverflow);

  return {
    maxScroll,
    percent,
    hasScrollOverflow,
    hasBottomOverflow,
  };
}

class ManagedScrollCue {
  constructor(element) {
    this.element = element;
    this.inlineProgress =
      element.dataset.scrollCueProgress === INLINE_PROGRESS_MODE;
    this.progress = null;
    this.progressFill = null;
    this.frame = 0;
    this.handleScroll = () => this.scheduleUpdate();
  }

  mount() {
    this.element.classList.add('style-scroll-cue');
    this.createProgress();
    this.element.addEventListener('scroll', this.handleScroll, { passive: true });
    this.scheduleUpdate();
  }

  destroy() {
    this.cancelScheduledUpdate();
    this.element.removeEventListener('scroll', this.handleScroll);
    this.element.classList.remove(
      'style-scroll-cue',
      'has-scroll-overflow',
      'has-bottom-overflow',
    );
    this.element.style.removeProperty(SCROLL_PROGRESS_PROPERTY);
    this.progress?.remove();
    this.progress = null;
    this.progressFill = null;
  }

  createProgress() {
    if (this.inlineProgress || this.progress || !this.element.parentNode) {
      return;
    }

    const document = this.element.ownerDocument;
    const progress = document.createElement('div');
    progress.className = 'style-progress style-scroll-cue-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.hidden = true;

    const fill = document.createElement('div');
    fill.className = 'style-progress__fill style-scroll-cue-progress-fill';
    progress.append(fill);

    this.element.after(progress);
    this.progress = progress;
    this.progressFill = fill;
  }

  scheduleUpdate() {
    if (this.frame) {
      return;
    }

    if (typeof requestAnimationFrame === 'function') {
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.update();
      });
      return;
    }

    this.update();
  }

  cancelScheduledUpdate() {
    if (!this.frame || typeof cancelAnimationFrame !== 'function') {
      this.frame = 0;
      return;
    }

    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  update() {
    updateScrollCueState({
      scrollElement: this.element,
      cueElement: this.element,
      progressFill: this.progressFill,
      progressElement: this.progress,
      inlineCue: this.inlineProgress,
    });
  }
}

export class ScrollCueManager {
  constructor({ selector = SCROLL_CUE_SELECTOR } = {}) {
    this.selector = selector;
    this.root = null;
    this.window = null;
    this.observer = null;
    this.cues = new Map();
    this.scanFrame = 0;
    this.handleMutation = (mutations) => this.handleMutations(mutations);
    this.handleResize = () => this.scheduleUpdates();
  }

  mount(root) {
    if (!root || this.root) {
      return;
    }

    this.root = root;
    this.window = root.ownerDocument?.defaultView ?? globalThis;

    const MutationObserverCtor = this.window?.MutationObserver;

    if (typeof MutationObserverCtor === 'function') {
      this.observer = new MutationObserverCtor(this.handleMutation);
      this.observer.observe(root, {
        attributes: true,
        attributeFilter: ['class', 'hidden', 'style', 'aria-hidden'],
        childList: true,
        subtree: true,
      });
    }

    this.window?.addEventListener?.('resize', this.handleResize);
    this.scan();
  }

  unmount() {
    this.cancelScheduledScan();
    this.observer?.disconnect();
    this.observer = null;
    this.window?.removeEventListener?.('resize', this.handleResize);
    this.window = null;

    for (const cue of this.cues.values()) {
      cue.destroy();
    }

    this.cues.clear();
    this.root = null;
  }

  scheduleScan() {
    if (this.scanFrame) {
      return;
    }

    if (typeof requestAnimationFrame === 'function') {
      this.scanFrame = requestAnimationFrame(() => {
        this.scanFrame = 0;
        this.scan();
      });
      return;
    }

    this.scan();
  }

  cancelScheduledScan() {
    if (!this.scanFrame || typeof cancelAnimationFrame !== 'function') {
      this.scanFrame = 0;
      return;
    }

    cancelAnimationFrame(this.scanFrame);
    this.scanFrame = 0;
  }

  handleMutations(mutations = []) {
    let shouldScan = false;
    let shouldUpdate = false;

    for (const mutation of mutations) {
      if (this.mutationMayChangeCueRegistration(mutation)) {
        shouldScan = true;
        break;
      }

      if (this.mutationMayChangeCueLayout(mutation)) {
        shouldUpdate = true;
      }
    }

    if (shouldScan) {
      this.scheduleScan();
      return;
    }

    if (shouldUpdate) {
      this.scheduleUpdates();
    }
  }

  mutationMayChangeCueRegistration(mutation) {
    if (mutation.type === 'attributes') {
      return (
        mutation.attributeName === 'class' &&
        this.elementMatchesOrContainsCue(mutation.target)
      );
    }

    if (mutation.type !== 'childList') {
      return false;
    }

    return [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
      this.elementMatchesOrContainsCue(node),
    );
  }

  mutationMayChangeCueLayout(mutation) {
    if (mutation.type === 'attributes') {
      return this.elementRelatesToManagedCue(mutation.target);
    }

    if (mutation.type !== 'childList') {
      return false;
    }

    return (
      this.elementRelatesToManagedCue(mutation.target) ||
      [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
        this.elementRelatesToManagedCue(node),
      )
    );
  }

  elementMatchesOrContainsCue(node) {
    if (!this.isElement(node)) {
      return false;
    }

    return node.matches?.(this.selector) || Boolean(node.querySelector?.(this.selector));
  }

  elementRelatesToManagedCue(node) {
    if (!this.isElement(node)) {
      return false;
    }

    for (const element of this.cues.keys()) {
      if (element === node || element.contains(node) || node.contains(element)) {
        return true;
      }
    }

    return false;
  }

  isElement(node) {
    return node?.nodeType === 1;
  }

  scan() {
    if (!this.root) {
      return;
    }

    this.removeDetachedCues();

    for (const element of this.root.querySelectorAll(this.selector)) {
      this.ensureCue(element);
    }

    this.scheduleUpdates();
  }

  ensureCue(element) {
    if (this.cues.has(element)) {
      return;
    }

    const cue = new ManagedScrollCue(element);
    this.cues.set(element, cue);
    cue.mount();
  }

  removeDetachedCues() {
    for (const [element, cue] of this.cues) {
      if (this.root.contains(element)) {
        continue;
      }

      cue.destroy();
      this.cues.delete(element);
    }
  }

  scheduleUpdates() {
    for (const cue of this.cues.values()) {
      cue.scheduleUpdate();
    }
  }
}
