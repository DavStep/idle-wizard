export const DEFAULT_PLAYER_FRAME = 'classic';

export const PLAYER_FRAME_OPTIONS = Object.freeze([
  Object.freeze({ key: 'classic', label: 'classic', tint: 0xffffff }),
  Object.freeze({ key: 'emerald', label: 'emerald', tint: 0xa3f6b2 }),
  Object.freeze({ key: 'gnome', label: 'gnome', tint: 0xffaaa0 }),
  Object.freeze({ key: 'sun', label: 'sun', tint: 0xffe08a }),
  Object.freeze({ key: 'violet', label: 'violet', tint: 0xddb6ff }),
  Object.freeze({ key: 'bronze', label: 'bronze', tint: 0xe8b982 }),
]);

const PLAYER_FRAME_BY_KEY = new Map(
  PLAYER_FRAME_OPTIONS.map((frame) => [frame.key, frame]),
);

export function normalizePlayerFrame(frame) {
  const key = String(frame ?? '').trim().toLowerCase();
  return PLAYER_FRAME_BY_KEY.has(key) ? key : DEFAULT_PLAYER_FRAME;
}

export function getPlayerFrameOptions() {
  return PLAYER_FRAME_OPTIONS.map((frame) => ({ ...frame }));
}

export function getPlayerFrameTint(frame) {
  return PLAYER_FRAME_BY_KEY.get(normalizePlayerFrame(frame))?.tint ?? 0xffffff;
}
