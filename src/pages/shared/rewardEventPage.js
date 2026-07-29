const REWARD_EVENT_PAGE_IDS = Object.freeze({
  seed_summoned: 'workshop',
  personal_task_reward_claimed: 'workshop',
  herb_harvested: 'garden',
  potion_collected: 'brewing',
  item_sold: 'shop',
  item_bought: 'shop',
  coin_collected: 'shop',
});

export function getRewardEventPageId(event) {
  const explicitPageId =
    typeof event?.pageId === 'string' ? event.pageId.trim() : '';

  if (explicitPageId) {
    return explicitPageId;
  }

  return REWARD_EVENT_PAGE_IDS[event?.type] ?? null;
}

export function isRewardEventForPage(event, pageId) {
  const eventPageId = getRewardEventPageId(event);
  return eventPageId === null || eventPageId === pageId;
}
